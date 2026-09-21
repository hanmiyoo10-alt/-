package io.hanmiyoo.mcl.guibridge;

import android.accessibilityservice.AccessibilityService;
import android.app.KeyguardManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.hardware.HardwareBuffer;
import android.net.Credentials;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import android.os.Bundle;
import android.util.Base64;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public final class GuiBridgeService extends AccessibilityService {
    private static final String SCHEMA="mcl-gui.v1", SOCKET_NAME="mcl-gui-v1";
    private static final int MAX_REQUEST_CHARS=8192, MAX_NODES=600, MAX_ACTIONS=120, MAX_DEPTH=18;
    private static final long MAX_WAIT_MS=15_000L;
    private final Object snapshotLock=new Object();
    private final Map<String,NodeRef> handles=new LinkedHashMap<>();
    private long generation=0L;
    private int snapshotWindowId=-1;
    private volatile boolean running=false;
    private LocalServerSocket serverSocket;

    @Override protected void onServiceConnected(){super.onServiceConnected();running=true;new Thread(this::serveLoop,"mcl-gui-local-socket").start();}
    @Override public void onAccessibilityEvent(AccessibilityEvent event){if(event!=null&&event.getEventType()==AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED)invalidateSnapshot();}
    @Override public void onInterrupt(){invalidateSnapshot();}
    @Override public void onDestroy(){running=false;try{if(serverSocket!=null)serverSocket.close();}catch(IOException ignored){}super.onDestroy();}

    private void invalidateSnapshot(){synchronized(snapshotLock){generation++;snapshotWindowId=-1;handles.clear();}}

    private void serveLoop(){
        try(LocalServerSocket server=new LocalServerSocket(SOCKET_NAME)){
            serverSocket=server;
            while(running){
                try(LocalSocket client=server.accept()){
                    JSONObject out;
                    if(!peerIsTermux(client)){out=response("unknown","BLOCKED_PEER_IDENTITY");}
                    else{
                        String line=readBoundedLine(new BufferedReader(new InputStreamReader(client.getInputStream(),StandardCharsets.UTF_8)));
                        out=handleRequest(new JSONObject(line));
                    }
                    BufferedWriter writer=new BufferedWriter(new OutputStreamWriter(client.getOutputStream(),StandardCharsets.UTF_8));
                    writer.write(out.toString());writer.newLine();writer.flush();
                }catch(Exception ignored){}
            }
        }catch(IOException ignored){running=false;}finally{serverSocket=null;}
    }

    private boolean peerIsTermux(LocalSocket client){
        try{
            Credentials credentials=client.getPeerCredentials();
            ApplicationInfo app=getPackageManager().getApplicationInfo(BridgePolicy.TERMUX_PACKAGE,0);
            return credentials!=null&&PeerPolicy.authorized(credentials.getUid(),app.uid);
        }catch(Exception error){return false;}
    }

    private String readBoundedLine(BufferedReader reader)throws IOException{
        StringBuilder out=new StringBuilder();int ch;
        while((ch=reader.read())!=-1){if(ch=='\n')break;if(ch=='\r')continue;if(out.length()>=MAX_REQUEST_CHARS)throw new IOException("REQUEST_TOO_LARGE");out.append((char)ch);}
        if(out.length()==0)throw new IOException("EMPTY_REQUEST");return out.toString();
    }

    private JSONObject handleRequest(JSONObject request)throws JSONException{
        String op=request.optString("op","unknown");
        if(!SCHEMA.equals(request.optString("schema")))return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");
        switch(op){
            case "status":return status(op);
            case "launch_chatgpt":return launchChatGpt(op);
            case "snapshot":return snapshot(op,request.optBoolean("include_screenshot",false));
            case "find_action":return findAction(op,request.optString("label",null));
            case "click":return click(op,request.optString("handle",null));
            case "find_editable":return findEditable(op);
            case "set_text":return setText(op,request.optString("handle",null),request.optString("text",null));
            case "wait_text":return waitText(op,request.optString("text",null),request.optLong("timeout_ms",0L));
            default:return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");
        }
    }

    private JSONObject status(String op)throws JSONException{
        JSONObject out=response(op,"PASS");
        out.put("consent",MainActivity.hasConsent(this));out.put("locked",isLocked());
        out.put("target_installed",packageInstalled(BridgePolicy.TARGET_PACKAGE));out.put("termux_installed",packageInstalled(BridgePolicy.TERMUX_PACKAGE));
        return out;
    }

    private JSONObject launchChatGpt(String op)throws JSONException{
        String blocked=preflightMutation();if(blocked!=null)return response(op,blocked);
        Intent launch=getPackageManager().getLaunchIntentForPackage(BridgePolicy.TARGET_PACKAGE);
        if(launch==null)return response(op,"BLOCKED_TARGET_PACKAGE");
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try{startActivity(launch);return response(op,"OK");}catch(RuntimeException error){return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");}
    }

    private JSONObject snapshot(String op,boolean includeScreenshot)throws JSONException{
        String blocked=preflightRead();if(blocked!=null)return response(op,blocked);
        AccessibilityNodeInfo root=getRootInActiveWindow();if(!isTargetRoot(root))return response(op,"BLOCKED_TARGET_PACKAGE");
        if(containsRestrictedCredentialNode(root,0,new int[]{0}))return response(op,"BLOCKED_ACCOUNT_SURFACE");
        JSONArray actions=new JSONArray();long currentGeneration;int windowId=root.getWindowId();
        synchronized(snapshotLock){generation++;currentGeneration=generation;snapshotWindowId=windowId;handles.clear();collectActions(root,0,new int[]{0},actions,currentGeneration,windowId);}
        JSONObject out=response(op,"PASS");out.put("generation",currentGeneration);out.put("window_id",windowId);out.put("target_package",BridgePolicy.TARGET_PACKAGE);out.put("actions",actions);
        if(includeScreenshot){JSONObject shot=captureScreenshot(windowId);if(!"PASS".equals(shot.optString("status")))return shot.put("op",op);out.put("screenshot_png_b64",shot.getString("screenshot_png_b64"));}
        return out;
    }

    private void collectActions(AccessibilityNodeInfo node,int depth,int[] visited,JSONArray output,long currentGeneration,int windowId)throws JSONException{
        if(node==null||depth>MAX_DEPTH||visited[0]++>=MAX_NODES||output.length()>=MAX_ACTIONS)return;
        boolean editable=node.isEditable()&&!node.isPassword()&&node.isEnabled();
        boolean clickable=node.isClickable()&&node.isEnabled()&&!node.isPassword();
        String label=BridgePolicy.visibleLabel(node.getText(),node.getContentDescription(),editable);
        if((editable||clickable)&&label!=null&&!BridgePolicy.restrictedLabel(label)){
            String handle=SnapshotHandle.create(currentGeneration,windowId,handles.size());
            handles.put(handle,new NodeRef(node,editable,clickable,label));
            output.put(new JSONObject().put("handle",handle).put("label",label).put("editable",editable).put("clickable",clickable));
        }
        for(int i=0;i<node.getChildCount();i++){AccessibilityNodeInfo child=node.getChild(i);if(child!=null)collectActions(child,depth+1,visited,output,currentGeneration,windowId);}
    }

    private JSONObject findAction(String op,String label)throws JSONException{
        if(!BridgePolicy.boundedText(label)||BridgePolicy.restrictedLabel(label))return response(op,"BLOCKED_ACCOUNT_SURFACE");
        synchronized(snapshotLock){
            JSONArray matches=new JSONArray();
            for(Map.Entry<String,NodeRef> entry:handles.entrySet()){NodeRef ref=entry.getValue();if(ref.clickable&&label.equals(ref.label))matches.put(entry.getKey());}
            if(matches.length()==0)return response(op,"NOT_FOUND");if(matches.length()!=1)return response(op,"AMBIGUOUS").put("match_count",matches.length());
            return response(op,"FOUND").put("handle",matches.getString(0));
        }
    }

    private JSONObject findEditable(String op)throws JSONException{
        synchronized(snapshotLock){
            JSONArray matches=new JSONArray();for(Map.Entry<String,NodeRef> entry:handles.entrySet())if(entry.getValue().editable)matches.put(entry.getKey());
            if(matches.length()==0)return response(op,"NOT_FOUND");if(matches.length()!=1)return response(op,"AMBIGUOUS").put("match_count",matches.length());
            return response(op,"FOUND").put("handle",matches.getString(0));
        }
    }

    private JSONObject click(String op,String handle)throws JSONException{
        String blocked=preflightMutation();if(blocked!=null)return response(op,blocked);
        NodeRef ref=currentHandle(handle);if(ref==null)return response(op,"STALE_SNAPSHOT");
        if(!ref.clickable||BridgePolicy.restrictedLabel(ref.label))return response(op,"BLOCKED_ACCOUNT_SURFACE");
        return response(op,ref.node.performAction(AccessibilityNodeInfo.ACTION_CLICK)?"OK":"BLOCKED_UI_NOT_ACCESSIBLE");
    }

    private JSONObject setText(String op,String handle,String text)throws JSONException{
        String blocked=preflightMutation();if(blocked!=null)return response(op,blocked);
        if(!BridgePolicy.boundedText(text))return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");
        AccessibilityNodeInfo root=getRootInActiveWindow();if(containsRestrictedCredentialNode(root,0,new int[]{0}))return response(op,"BLOCKED_ACCOUNT_SURFACE");
        NodeRef ref=currentHandle(handle);if(ref==null)return response(op,"STALE_SNAPSHOT");if(!ref.editable||ref.node.isPassword())return response(op,"BLOCKED_ACCOUNT_SURFACE");
        Bundle args=new Bundle();args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,text);
        return response(op,ref.node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args)?"OK":"BLOCKED_UI_NOT_ACCESSIBLE");
    }

    private JSONObject waitText(String op,String text,long timeoutMs)throws JSONException{
        if(!BridgePolicy.boundedText(text)||timeoutMs<=0L||timeoutMs>MAX_WAIT_MS)return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");
        long deadline=System.currentTimeMillis()+timeoutMs;
        while(System.currentTimeMillis()<=deadline){
            AccessibilityNodeInfo root=getRootInActiveWindow();if(!isTargetRoot(root))return response(op,"BLOCKED_TARGET_PACKAGE");
            if(containsExactText(root,text,0,new int[]{0}))return response(op,"FOUND");
            try{Thread.sleep(250L);}catch(InterruptedException error){Thread.currentThread().interrupt();return response(op,"BLOCKED_UI_NOT_ACCESSIBLE");}
        }
        return response(op,"NOT_FOUND");
    }

    private NodeRef currentHandle(String handle){
        synchronized(snapshotLock){
            AccessibilityNodeInfo root=getRootInActiveWindow();if(!isTargetRoot(root))return null;
            if(!SnapshotHandle.matches(handle,generation,snapshotWindowId)||root.getWindowId()!=snapshotWindowId)return null;
            return handles.get(handle);
        }
    }

    private boolean containsRestrictedCredentialNode(AccessibilityNodeInfo node,int depth,int[] visited){
        if(node==null||depth>MAX_DEPTH||visited[0]++>=MAX_NODES)return false;if(node.isPassword())return true;
        if((node.isClickable()||node.isEditable())&&BridgePolicy.restrictedLabel(BridgePolicy.visibleLabel(node.getText(),node.getContentDescription(),false)))return true;
        for(int i=0;i<node.getChildCount();i++)if(containsRestrictedCredentialNode(node.getChild(i),depth+1,visited))return true;return false;
    }

    private boolean containsExactText(AccessibilityNodeInfo node,String expected,int depth,int[] visited){
        if(node==null||depth>MAX_DEPTH||visited[0]++>=MAX_NODES)return false;
        CharSequence text=node.getText(),description=node.getContentDescription();
        if((text!=null&&expected.contentEquals(text))||(description!=null&&expected.contentEquals(description)))return true;
        for(int i=0;i<node.getChildCount();i++)if(containsExactText(node.getChild(i),expected,depth+1,visited))return true;return false;
    }

    private JSONObject captureScreenshot(int windowId)throws JSONException{
        AtomicReference<JSONObject> result=new AtomicReference<>();CountDownLatch latch=new CountDownLatch(1);
        takeScreenshotOfWindow(windowId,getMainExecutor(),new TakeScreenshotCallback(){
            @Override public void onSuccess(ScreenshotResult screenshot){
                HardwareBuffer buffer=screenshot.getHardwareBuffer();
                try{
                    Bitmap hardware=Bitmap.wrapHardwareBuffer(buffer,screenshot.getColorSpace());
                    if(hardware==null){result.set(responseUnchecked("snapshot","BLOCKED_UI_NOT_ACCESSIBLE"));return;}
                    Bitmap software=hardware.copy(Bitmap.Config.ARGB_8888,false);
                    if(software==null){result.set(responseUnchecked("snapshot","BLOCKED_UI_NOT_ACCESSIBLE"));return;}
                    ByteArrayOutputStream out=new ByteArrayOutputStream();
                    if(!software.compress(Bitmap.CompressFormat.PNG,100,out)){result.set(responseUnchecked("snapshot","BLOCKED_UI_NOT_ACCESSIBLE"));return;}
                    result.set(responseUnchecked("snapshot","PASS").put("screenshot_png_b64",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP)));
                }catch(Exception error){result.set(responseUnchecked("snapshot","BLOCKED_UI_NOT_ACCESSIBLE"));}finally{buffer.close();latch.countDown();}
            }
            @Override public void onFailure(int errorCode){result.set(responseUnchecked("snapshot",errorCode==ERROR_TAKE_SCREENSHOT_SECURE_WINDOW?"BLOCKED_SECURE_WINDOW":"BLOCKED_UI_NOT_ACCESSIBLE"));latch.countDown();}
        });
        try{if(!latch.await(5,TimeUnit.SECONDS))return response("snapshot","BLOCKED_UI_NOT_ACCESSIBLE");}catch(InterruptedException error){Thread.currentThread().interrupt();return response("snapshot","BLOCKED_UI_NOT_ACCESSIBLE");}
        JSONObject value=result.get();return value==null?response("snapshot","BLOCKED_UI_NOT_ACCESSIBLE"):value;
    }

    private String preflightRead(){if(!MainActivity.hasConsent(this))return "BLOCKED_USER_PERMISSION";if(isLocked())return "BLOCKED_LOCKED";if(!packageInstalled(BridgePolicy.TARGET_PACKAGE))return "BLOCKED_TARGET_PACKAGE";return null;}
    private String preflightMutation(){String blocked=preflightRead();if(blocked!=null)return blocked;AccessibilityNodeInfo root=getRootInActiveWindow();if(root!=null&&containsRestrictedCredentialNode(root,0,new int[]{0}))return "BLOCKED_ACCOUNT_SURFACE";return null;}
    private boolean isLocked(){KeyguardManager manager=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);return manager!=null&&manager.isDeviceLocked();}
    private boolean packageInstalled(String packageName){try{getPackageManager().getApplicationInfo(packageName,0);return true;}catch(PackageManager.NameNotFoundException error){return false;}}
    private boolean isTargetRoot(AccessibilityNodeInfo root){return root!=null&&root.getPackageName()!=null&&BridgePolicy.TARGET_PACKAGE.contentEquals(root.getPackageName());}
    private JSONObject response(String op,String status)throws JSONException{return new JSONObject().put("schema",SCHEMA).put("op",op).put("status",status);}
    private static JSONObject responseUnchecked(String op,String status){try{return new JSONObject().put("schema",SCHEMA).put("op",op).put("status",status);}catch(JSONException impossible){throw new IllegalStateException(impossible);}}

    private static final class NodeRef{
        final AccessibilityNodeInfo node;final boolean editable;final boolean clickable;final String label;
        NodeRef(AccessibilityNodeInfo source,boolean editable,boolean clickable,String label){this.node=AccessibilityNodeInfo.obtain(source);this.editable=editable;this.clickable=clickable;this.label=label;}
    }
}
