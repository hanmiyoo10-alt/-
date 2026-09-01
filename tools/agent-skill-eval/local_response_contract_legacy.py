#!/usr/bin/env python3
"""Resolve and validate bounded structured response contracts for local Agent Skill evals."""
from __future__ import annotations
import hashlib, json, re
from pathlib import Path
from typing import Any

SCHEMA_VERSION=1
V8_CONTRACT_ID="impact-scope-grounded-flow-v8"
V9_CONTRACT_ID="candidate-grounded-impact-report-v9"
CLAIM_STATUSES={"DIRECT","SUPPORTED_LIKELY","UNKNOWN","CONFLICT"}
EVIDENCE_STATUSES=CLAIM_STATUSES-{"UNKNOWN"}
EVIDENCE_STATUS_ORDER=("DIRECT","SUPPORTED_LIKELY","CONFLICT")
RESOLVED_STATUSES={"DIRECT","SUPPORTED_LIKELY"}
EVIDENCE_ID_RE=re.compile(r"E[1-9][0-9]*\Z")
FLOW_ID_RE=re.compile(r"F[1-9][0-9]*\Z")
SOURCE_BLOCK_ID_RE=re.compile(r"S[1-9][0-9]*\Z")
BASIS_CLAIMS=("authority","request_identity","no_extra_io","tests","generated_release","narrowest_boundary")
V8_TOP_LEVEL_KEYS={"scope","authority","flow_edges","request_identity","no_extra_io","tests","generated_release","narrowest_boundary","blocked_claims"}
V9_TOP_LEVEL_KEYS={"scope","authority","semanticOwners","flowEdges","preservation","testsContracts","generatedRelease","narrowestBoundary"}

class ResponseContractError(ValueError): pass

def _load_json(path:Path)->dict[str,Any]:
    try: data=json.loads(path.read_text(encoding="utf-8"))
    except (OSError,json.JSONDecodeError) as exc: raise ResponseContractError(f"cannot read JSON {path}: {exc}") from exc
    if not isinstance(data,dict): raise ResponseContractError("JSON object required")
    return data

def canonical_json(value:Any)->str: return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"))
def contract_sha256(contract): return None if contract is None else hashlib.sha256(canonical_json(contract).encode()).hexdigest()

def _validate_evidence_registry_shape(value):
    if not isinstance(value,dict) or not 1<=len(value)<=16: raise ResponseContractError("response contract evidence_registry must contain 1-16 entries")
    out={}
    for eid,entry in value.items():
        if not isinstance(eid,str) or EVIDENCE_ID_RE.fullmatch(eid) is None: raise ResponseContractError(f"invalid evidence id: {eid}")
        if not isinstance(entry,dict) or set(entry)!={"source_path","source_anchor"}: raise ResponseContractError(f"evidence {eid} must contain exactly source_path and source_anchor")
        if not all(isinstance(entry.get(k),str) and entry[k].strip() for k in ("source_path","source_anchor")): raise ResponseContractError(f"evidence {eid} locator missing")
        out[eid]={"source_path":entry["source_path"].strip(),"source_anchor":entry["source_anchor"].strip()}
    return out

def _validate_evidence_status_map(value,registry,label):
    if not isinstance(value,dict) or not value: raise ResponseContractError(f"{label} must be a non-empty object")
    out={}
    for eid,statuses in value.items():
        if eid not in registry: raise ResponseContractError(f"{label} references unknown evidence id: {eid}")
        if not isinstance(statuses,list) or not statuses or len(statuses)!=len(set(statuses)): raise ResponseContractError(f"{label}.{eid} statuses invalid")
        if any(s not in EVIDENCE_STATUSES for s in statuses): raise ResponseContractError(f"{label}.{eid} contains invalid evidence status")
        out[eid]=[s for s in EVIDENCE_STATUS_ORDER if s in statuses]
    return out

def _validate_claim_evidence_status_allowlist(value,registry):
    if not isinstance(value,dict) or set(value)!=set(BASIS_CLAIMS): raise ResponseContractError("claim_evidence_status_allowlist must contain exactly "+", ".join(BASIS_CLAIMS))
    return {c:_validate_evidence_status_map(value[c],registry,f"claim_evidence_status_allowlist.{c}") for c in BASIS_CLAIMS}

def _validate_flow_edge_registry(value,registry):
    if not isinstance(value,dict) or not 1<=len(value)<=8: raise ResponseContractError("flow_edge_registry must contain 1-8 entries")
    out={}
    for fid,raw in value.items():
        if not isinstance(fid,str) or FLOW_ID_RE.fullmatch(fid) is None: raise ResponseContractError(f"invalid flow edge id: {fid}")
        if not isinstance(raw,dict) or set(raw)!={"from","to","evidence_ids"}: raise ResponseContractError(f"flow edge {fid} malformed")
        src,tgt,eids=raw["from"],raw["to"],raw["evidence_ids"]
        if not isinstance(src,str) or not src.strip() or len(src)>120 or not isinstance(tgt,str) or not tgt.strip() or len(tgt)>120 or src==tgt: raise ResponseContractError(f"flow edge {fid} endpoints invalid")
        if not isinstance(eids,list) or not 1<=len(eids)<=4 or len(eids)!=len(set(eids)) or any(e not in registry for e in eids): raise ResponseContractError(f"flow edge {fid}.evidence_ids invalid")
        out[fid]={"from":src.strip(),"to":tgt.strip(),"evidence_ids":list(eids)}
    return out

def _validate_required_flow_edge_ids(value,flows):
    if not isinstance(value,list) or not value or len(value)!=len(set(value)) or any(v not in flows for v in value): raise ResponseContractError("required_flow_edge_ids invalid")
    return list(value)

def _basis_enum(allowed):
    vals=["UNKNOWN"]
    for status in EVIDENCE_STATUS_ORDER:
        for eid,statuses in allowed.items():
            if status in statuses: vals.append(f"{status}:{eid}")
    return vals

def _v8_schema(c):
    a=c["claim_evidence_status_allowlist"]; fids=sorted(c["flow_edge_registry"],key=lambda x:int(x[1:])); scope=c["expected_scope"]
    return {"type":"object","properties":{"scope":{"type":"string","enum":[scope]},"authority":{"type":"string","enum":_basis_enum(a["authority"])},"flow_edges":{"type":"array","minItems":0,"maxItems":min(3,len(fids)),"items":{"type":"string","enum":fids}},"request_identity":{"type":"string","enum":_basis_enum(a["request_identity"])},"no_extra_io":{"type":"string","enum":_basis_enum(a["no_extra_io"])},"tests":{"type":"array","maxItems":2,"items":{"type":"string","enum":_basis_enum(a["tests"])}},"generated_release":{"type":"string","enum":_basis_enum(a["generated_release"])},"narrowest_boundary":{"type":"string","enum":_basis_enum(a["narrowest_boundary"])},"blocked_claims":{"type":"array","maxItems":0,"items":{"type":"string","maxLength":120}}},"required":["scope","authority","flow_edges","request_identity","no_extra_io","tests","generated_release","narrowest_boundary","blocked_claims"],"additionalProperties":False}

def _source_ref_schema(): return {"type":"object","properties":{"sourceBlockId":{"type":"string","enum":[f"S{i}" for i in range(1,17)]},"sourceAnchor":{"type":"string","maxLength":120}},"required":["sourceBlockId","sourceAnchor"],"additionalProperties":False}
def _refs_schema(): return {"type":"array","maxItems":3,"items":_source_ref_schema()}
def _simple_claim_schema(with_value=False):
    props={"status":{"type":"string","enum":["DIRECT","SUPPORTED_LIKELY","UNKNOWN","CONFLICT"]},"sourceRefs":_refs_schema()}
    req=["status","sourceRefs"]
    if with_value: props["value"]={"type":"string","maxLength":120}; req.insert(1,"value")
    return {"type":"object","properties":props,"required":req,"additionalProperties":False}
def _named_claim_schema(name):
    return {"type":"object","properties":{name:{"type":"string","maxLength":100},"status":{"type":"string","enum":["DIRECT","SUPPORTED_LIKELY","CONFLICT"]},"sourceRefs":_refs_schema()},"required":[name,"status","sourceRefs"],"additionalProperties":False}
def _v9_schema(c):
    return {"type":"object","properties":{"scope":{"type":"string","enum":[c["expected_scope"]]},"authority":_simple_claim_schema(True),"semanticOwners":{"type":"array","maxItems":6,"items":_named_claim_schema("label")},"flowEdges":{"type":"array","maxItems":6,"items":{"type":"object","properties":{"from":{"type":"string","maxLength":100},"to":{"type":"string","maxLength":100},"status":{"type":"string","enum":["DIRECT","SUPPORTED_LIKELY","CONFLICT"]},"sourceRefs":_refs_schema()},"required":["from","to","status","sourceRefs"],"additionalProperties":False}},"preservation":{"type":"object","properties":{"requestIdentity":_simple_claim_schema(),"noExtraIo":_simple_claim_schema(),"otherBoundaries":{"type":"array","maxItems":6,"items":_named_claim_schema("boundary")}},"required":["requestIdentity","noExtraIo","otherBoundaries"],"additionalProperties":False},"testsContracts":{"type":"array","maxItems":4,"items":_named_claim_schema("boundary")},"generatedRelease":_simple_claim_schema(True),"narrowestBoundary":_simple_claim_schema(True)},"required":["scope","authority","semanticOwners","flowEdges","preservation","testsContracts","generatedRelease","narrowestBoundary"],"additionalProperties":False}

def build_schema(c):
    if c["id"]==V8_CONTRACT_ID:return _v8_schema(c)
    if c["id"]==V9_CONTRACT_ID:return _v9_schema(c)
    raise ResponseContractError(f"unsupported response contract id: {c.get('id')}")

def load_contract(path,skill,case_id):
    data=_load_json(path)
    if data.get("schema_version")!=SCHEMA_VERSION: raise ResponseContractError("unsupported response-contract schema_version")
    sm=data.get("contracts",{}).get(str(skill))
    if sm is None:return None
    if not isinstance(sm,dict): raise ResponseContractError("skill response-contract map must be an object")
    raw=sm.get(str(case_id))
    if raw is None:return None
    if not isinstance(raw,dict): raise ResponseContractError("response contract must be an object")
    cid=raw.get("id")
    if cid==V8_CONTRACT_ID:
        expected={"id","expected_scope","prompt_instruction","evidence_registry","flow_edge_registry","required_flow_edge_ids","claim_evidence_status_allowlist"}
        if set(raw)!=expected: raise ResponseContractError("v8 response contract fields invalid")
        reg=_validate_evidence_registry_shape(raw["evidence_registry"]); flows=_validate_flow_edge_registry(raw["flow_edge_registry"],reg)
        c=dict(raw); c["evidence_registry"]=reg;c["flow_edge_registry"]=flows;c["required_flow_edge_ids"]=_validate_required_flow_edge_ids(raw["required_flow_edge_ids"],flows);c["claim_evidence_status_allowlist"]=_validate_claim_evidence_status_allowlist(raw["claim_evidence_status_allowlist"],reg)
    elif cid==V9_CONTRACT_ID:
        if set(raw)!={"id","expected_scope","prompt_instruction"}: raise ResponseContractError("v9 candidate contract must not contain hidden expected-answer fields")
        c=dict(raw)
    else: raise ResponseContractError(f"unsupported response contract id: {cid}")
    if not isinstance(c.get("expected_scope"),str) or not c["expected_scope"] or not isinstance(c.get("prompt_instruction"),str) or not c["prompt_instruction"]: raise ResponseContractError("response contract identity missing")
    c["schema"]=build_schema(c);return c

def response_format(c): return None if c is None else {"type":"json_object","schema":c["schema"]}

def _source_map(context):
    blocks=context.get("blocks")
    if not isinstance(blocks,list): raise ResponseContractError("context blocks missing")
    out={}
    for b in blocks:
        if not isinstance(b,dict) or not isinstance(b.get("path"),str) or not isinstance(b.get("text"),str): raise ResponseContractError("context block path/text missing")
        out[b["path"]]=b["text"]
    return out

def validate_evidence_registry(c,context):
    reg=c.get("evidence_registry")
    if not isinstance(reg,dict): raise ResponseContractError("response contract evidence_registry missing")
    sources=_source_map(context);out={}
    for eid in sorted(reg,key=lambda x:int(x[1:])):
        e=reg[eid]
        if e["source_path"] not in sources or e["source_anchor"] not in sources[e["source_path"]]: raise ResponseContractError(f"evidence {eid} source anchor unavailable")
        out[eid]=dict(e)
    return out

def validate_flow_edge_registry(c,context):
    reg=validate_evidence_registry(c,context);out={}
    for fid in sorted(c["flow_edge_registry"],key=lambda x:int(x[1:])):
        e=c["flow_edge_registry"][fid]
        if any(x not in reg for x in e["evidence_ids"]): raise ResponseContractError(f"flow edge {fid} evidence unavailable")
        out[fid]=dict(e)
    return out

def evidence_legend(c,context):
    reg=validate_evidence_registry(c,context);return "\n".join(f"{eid} = {e['source_path']} :: {e['source_anchor']}" for eid,e in reg.items())
def flow_edge_legend(c,context):
    flows=validate_flow_edge_registry(c,context);return "\n".join(f"{fid} = {e['from']} -> {e['to']} :: {','.join(e['evidence_ids'])}" for fid,e in flows.items())
def claim_evidence_legend(c):
    a=c.get("claim_evidence_status_allowlist")
    if not isinstance(a,dict): raise ResponseContractError("claim_evidence_status_allowlist missing or malformed")
    return "\n".join(f"{claim} = {','.join(v for v in _basis_enum(a[claim]) if v!='UNKNOWN')}" for claim in BASIS_CLAIMS)
def source_block_legend(context):
    blocks=context.get("blocks")
    if not isinstance(blocks,list) or len(blocks)>16: raise ResponseContractError("context blocks missing or oversized")
    return "\n".join(f"S{i} = SOURCE {i}" for i,_ in enumerate(blocks,start=1))

def _validate_basis(value,label,registry,allowed):
    if not isinstance(value,str): raise ResponseContractError(f"{label} must be a string")
    if value=="UNKNOWN":return {"basis":value,"status":"UNKNOWN","evidence_id":None}
    if ":" not in value: raise ResponseContractError(f"{label} must be UNKNOWN or STATUS:E#")
    status,eid=value.split(":",1)
    if status not in EVIDENCE_STATUSES or eid not in registry or eid not in allowed or status not in allowed[eid]: raise ResponseContractError(f"{label} claim/evidence compatibility invalid")
    return {"basis":value,"status":status,"evidence_id":eid}

def _v8_validate(content,c,context):
    try:p=json.loads(content)
    except json.JSONDecodeError as exc: raise ResponseContractError(f"structured response is not valid JSON: {exc}") from exc
    if not isinstance(p,dict) or set(p)!=V8_TOP_LEVEL_KEYS: raise ResponseContractError("structured response v8 fields invalid")
    if p["scope"]!=c["expected_scope"]: raise ResponseContractError("scope mismatch")
    reg=validate_evidence_registry(c,context);flows=validate_flow_edge_registry(c,context);a=c["claim_evidence_status_allowlist"]
    auth=_validate_basis(p["authority"],"authority",reg,a["authority"]);ri=_validate_basis(p["request_identity"],"request_identity",reg,a["request_identity"]);io=_validate_basis(p["no_extra_io"],"no_extra_io",reg,a["no_extra_io"]);gr=_validate_basis(p["generated_release"],"generated_release",reg,a["generated_release"]);nb=_validate_basis(p["narrowest_boundary"],"narrowest_boundary",reg,a["narrowest_boundary"])
    flow_values=p["flow_edges"]
    if not isinstance(flow_values,list) or len(flow_values)>3 or any(not isinstance(x,str) or x not in flows for x in flow_values): raise ResponseContractError("flow_edges invalid")
    if len(flow_values)!=len(set(flow_values)): raise ResponseContractError("flow_edges invalid")
    if not isinstance(p["tests"],list) or len(p["tests"])>2: raise ResponseContractError("tests invalid")
    tests=[_validate_basis(x,f"tests[{i}]",reg,a["tests"]) for i,x in enumerate(p["tests"])]
    if p["blocked_claims"]!=[]: raise ResponseContractError("blocked_claims is a compatibility shell and must be empty")
    blocked=[]
    if auth["status"] not in RESOLVED_STATUSES:blocked.append("authority")
    for fid in c["required_flow_edge_ids"]:
        if fid not in flow_values:blocked.append(f"flow:{fid}")
    if ri["status"] not in RESOLVED_STATUSES:blocked.append("request_identity")
    if io["status"] not in RESOLVED_STATUSES:blocked.append("no_extra_io")
    if not any(x["status"] in RESOLVED_STATUSES for x in tests):blocked.append("tests")
    if gr["status"] not in RESOLVED_STATUSES:blocked.append("generated_release")
    if nb["status"] not in RESOLVED_STATUSES:blocked.append("narrowest_boundary")
    allb=[auth,ri,io,*tests,gr,nb]
    if any(x["status"]=="CONFLICT" for x in allb): verdict="CONFLICT"
    elif not flow_values and all(x["status"]=="UNKNOWN" for x in allb): verdict="UNKNOWN"
    elif not blocked: verdict="SUPPORTED"
    else: verdict="PARTIAL"
    out=dict(p);out["resolved_flow_edges"]=[{"id":x,**flows[x]} for x in flow_values];out["derived_blocked_claims"]=blocked;out["derived_impact_verdict"]=verdict;return out

def _blocks(context):
    bs=context.get("blocks")
    if not isinstance(bs,list) or len(bs)>16: raise ResponseContractError("context blocks missing or oversized")
    return {f"S{i}":b for i,b in enumerate(bs,start=1)}
def _refs(value,label,context,status):
    if not isinstance(value,list) or len(value)>3: raise ResponseContractError(f"{label}.sourceRefs invalid")
    if status=="UNKNOWN":
        if value: raise ResponseContractError(f"{label} UNKNOWN must have empty sourceRefs")
        return []
    if not value: raise ResponseContractError(f"{label} non-UNKNOWN requires sourceRefs")
    blocks=_blocks(context);out=[]
    for i,r in enumerate(value):
        if not isinstance(r,dict) or set(r)!={"sourceBlockId","sourceAnchor"}: raise ResponseContractError(f"{label}.sourceRefs[{i}] malformed")
        bid,anchor=r["sourceBlockId"],r["sourceAnchor"]
        if bid not in blocks or not isinstance(anchor,str) or not anchor or len(anchor)>120 or anchor not in str(blocks[bid].get("text","")): raise ResponseContractError(f"{label}.sourceRefs[{i}] invalid grounding")
        out.append(dict(r))
    return out
def _simple_claim(raw,label,context,with_value=False):
    expected={"status","sourceRefs"}|({"value"} if with_value else set())
    if not isinstance(raw,dict) or set(raw)!=expected or raw.get("status") not in CLAIM_STATUSES: raise ResponseContractError(f"{label} malformed")
    if with_value:
        val=raw["value"]
        if not isinstance(val,str) or len(val)>120 or (raw["status"]=="UNKNOWN" and val): raise ResponseContractError(f"{label}.value invalid")
    refs=_refs(raw["sourceRefs"],label,context,raw["status"]);return {"status":raw["status"],"sourceRefs":refs,**({"value":raw["value"]} if with_value else {})}
def _named_items(raw,label,name,context,max_items):
    if not isinstance(raw,list) or len(raw)>max_items: raise ResponseContractError(f"{label} invalid")
    out=[]
    for i,item in enumerate(raw):
        if not isinstance(item,dict) or set(item)!={name,"status","sourceRefs"} or item.get("status") not in EVIDENCE_STATUSES: raise ResponseContractError(f"{label}[{i}] malformed")
        text=item[name]
        if not isinstance(text,str) or not text or len(text)>100: raise ResponseContractError(f"{label}[{i}].{name} invalid")
        refs=_refs(item["sourceRefs"],f"{label}[{i}]",context,item["status"]);out.append({name:text,"status":item["status"],"sourceRefs":refs})
    return out
def _flow_items(raw,context):
    if not isinstance(raw,list) or len(raw)>6: raise ResponseContractError("flowEdges invalid")
    out=[]
    for i,item in enumerate(raw):
        if not isinstance(item,dict) or set(item)!={"from","to","status","sourceRefs"} or item.get("status") not in EVIDENCE_STATUSES: raise ResponseContractError(f"flowEdges[{i}] malformed")
        if not all(isinstance(item[k],str) and item[k] and len(item[k])<=100 for k in ("from","to")) or item["from"]==item["to"]: raise ResponseContractError(f"flowEdges[{i}] endpoints invalid")
        refs=_refs(item["sourceRefs"],f"flowEdges[{i}]",context,item["status"]);out.append({**item,"sourceRefs":refs})
    return out
def _v9_validate(content,c,context):
    try:p=json.loads(content)
    except json.JSONDecodeError as exc: raise ResponseContractError(f"structured response is not valid JSON: {exc}") from exc
    if not isinstance(p,dict) or set(p)!=V9_TOP_LEVEL_KEYS or p.get("scope")!=c["expected_scope"]: raise ResponseContractError("candidate grounded report fields/scope invalid")
    auth=_simple_claim(p["authority"],"authority",context,True);owners=_named_items(p["semanticOwners"],"semanticOwners","label",context,6);flows=_flow_items(p["flowEdges"],context)
    pres=p["preservation"]
    if not isinstance(pres,dict) or set(pres)!={"requestIdentity","noExtraIo","otherBoundaries"}: raise ResponseContractError("preservation malformed")
    ri=_simple_claim(pres["requestIdentity"],"preservation.requestIdentity",context);io=_simple_claim(pres["noExtraIo"],"preservation.noExtraIo",context);other=_named_items(pres["otherBoundaries"],"preservation.otherBoundaries","boundary",context,6);tests=_named_items(p["testsContracts"],"testsContracts","boundary",context,4);gr=_simple_claim(p["generatedRelease"],"generatedRelease",context,True);nb=_simple_claim(p["narrowestBoundary"],"narrowestBoundary",context,True)
    all_status=[auth["status"],ri["status"],io["status"],gr["status"],nb["status"]]+[x["status"] for x in owners+flows+other+tests]
    blocked=[]
    if auth["status"] not in RESOLVED_STATUSES:blocked.append("authority")
    if not any(x["status"] in RESOLVED_STATUSES for x in owners):blocked.append("semantic_owners")
    if not any(x["status"] in RESOLVED_STATUSES for x in flows):blocked.append("flow")
    if ri["status"] not in RESOLVED_STATUSES:blocked.append("request_identity")
    if io["status"] not in RESOLVED_STATUSES:blocked.append("no_extra_io")
    if not any(x["status"] in RESOLVED_STATUSES for x in tests):blocked.append("tests_contracts")
    if gr["status"] not in RESOLVED_STATUSES:blocked.append("generated_release")
    if nb["status"] not in RESOLVED_STATUSES:blocked.append("narrowest_boundary")
    if "CONFLICT" in all_status: blocked.append("conflict");verdict="CONFLICT"
    elif auth["status"]=="UNKNOWN" or not any(x["status"] in RESOLVED_STATUSES for x in flows): verdict="UNKNOWN"
    elif blocked: verdict="PARTIAL"
    else: verdict="SUPPORTED"
    out=dict(p);out["derived_blocked_claims"]=blocked;out["derived_impact_verdict"]=verdict;return out

def validate_content(content,c,context):
    if c is None:return None
    if c["id"]==V8_CONTRACT_ID:return _v8_validate(content,c,context)
    if c["id"]==V9_CONTRACT_ID:return _v9_validate(content,c,context)
    raise ResponseContractError(f"unsupported response contract id: {c.get('id')}")
