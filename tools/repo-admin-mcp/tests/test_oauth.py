from __future__ import annotations

import asyncio
import threading
import importlib.metadata
import json
import time
import unittest
import urllib.error
import urllib.parse
from pathlib import Path
from unittest.mock import patch

import jwt

from repo_admin_mcp import __version__
from repo_admin_mcp.config import EXPECTED_GITHUB_USER_ID, OAUTH_SCOPE
from repo_admin_mcp.oauth import OAuthBroker, OAuthError, _RejectRedirects, _pkce_s256
from repo_admin_mcp.server import OAuthMCPApp, build_http_app, mcp


BASE = "https://repo-admin-mcp-production.up.railway.app"
RESOURCE = BASE
CLIENT_ID = "https://chatgpt.com/oauth/client.json"
REDIRECT = "https://chatgpt.com/connector_platform_oauth_redirect"
VERIFIER = "A" * 64
CHALLENGE = _pkce_s256(VERIFIER)


def cimd(redirect: str = REDIRECT) -> dict:
    return {
        "client_id": CLIENT_ID,
        "redirect_uris": [redirect],
        "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"],
    }


def make_broker(*, now=None, user_id=EXPECTED_GITHUB_USER_ID, cimd_payload=None, **kwargs) -> OAuthBroker:
    clock = now or time.time
    return OAuthBroker(
        base_url=BASE,
        github_client_id="github-client-id",
        github_client_secret="github-client-secret",
        signing_key="S" * 64,
        now=clock,
        cimd_fetcher=lambda _url: cimd_payload or cimd(),
        github_identity_fetcher=lambda _code, _redirect: (user_id, "hanmiyoo10-alt"),
        **kwargs,
    )


def auth_params(**overrides) -> dict[str, str]:
    value = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT,
        "state": "chatgpt-state",
        "code_challenge": CHALLENGE,
        "code_challenge_method": "S256",
        "resource": RESOURCE,
        "scope": OAUTH_SCOPE,
    }
    value.update(overrides)
    return value


def callback_state(location: str) -> str:
    query = urllib.parse.parse_qs(urllib.parse.urlsplit(location).query)
    return query["state"][0]


def callback_code(location: str) -> str:
    query = urllib.parse.parse_qs(urllib.parse.urlsplit(location).query)
    return query["code"][0]


class InnerApp:
    def __init__(self) -> None:
        self.called = 0
        self.last_body = b""

    async def __call__(self, scope, receive, send):
        self.called += 1
        body = b""
        if scope.get("type") == "http":
            while True:
                message = await receive()
                if message.get("type") == "http.request":
                    body += message.get("body", b"")
                    if not message.get("more_body", False):
                        break
        self.last_body = body
        payload = b'{"jsonrpc":"2.0","id":1,"result":{"ok":true}}'
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({"type": "http.response.body", "body": payload})


async def run_asgi(
    app,
    *,
    path: str,
    method: str = "GET",
    body: bytes = b"",
    query: str = "",
    headers: list[tuple[bytes, bytes]] | None = None,
):
    sent = []
    delivered = False

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.request", "body": b"", "more_body": False}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        sent.append(message)

    await app(
        {
            "type": "http",
            "method": method,
            "path": path,
            "raw_path": path.encode(),
            "query_string": query.encode(),
            "headers": headers or [],
            "http_version": "1.1",
            "scheme": "https",
            "server": ("test", 443),
            "client": ("127.0.0.1", 12345),
        },
        receive,
        send,
    )
    return sent


async def run_disconnect_asgi(app, *, path: str, method: str = "POST"):
    sent = []
    receive_calls = 0

    async def receive():
        nonlocal receive_calls
        receive_calls += 1
        return {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    await app(
        {
            "type": "http",
            "method": method,
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "http_version": "1.1",
            "scheme": "https",
            "server": ("test", 443),
            "client": ("127.0.0.1", 12345),
        },
        receive,
        send,
    )
    return sent, receive_calls


def response_status(messages) -> int:
    return next(msg["status"] for msg in messages if msg["type"] == "http.response.start")


def response_headers(messages) -> dict[bytes, bytes]:
    start = next(msg for msg in messages if msg["type"] == "http.response.start")
    return {key.lower(): value for key, value in start.get("headers", [])}


def response_json(messages) -> dict:
    body = b"".join(msg.get("body", b"") for msg in messages if msg["type"] == "http.response.body")
    return json.loads(body)


class ToolsListInner:
    def __init__(self) -> None:
        self.called = 0

    async def __call__(self, scope, receive, send):
        self.called += 1
        while True:
            message = await receive()
            if message.get("type") == "http.request" and not message.get("more_body", False):
                break
        payload = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "tools": [{
                    "name": "private_mirror_writer_status",
                    "inputSchema": {"type": "object", "properties": {}},
                }]
            },
        }, separators=(",", ":")).encode()
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(payload)).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": payload})


class OAuthBrokerTests(unittest.TestCase):
    def test_metadata_is_exact_and_pkce_capable(self):
        broker = make_broker()
        resource = broker.protected_resource_metadata()
        auth = broker.authorization_server_metadata()
        self.assertEqual(resource["resource"], RESOURCE)
        self.assertEqual(resource["authorization_servers"], [BASE])
        self.assertEqual(resource["scopes_supported"], [OAUTH_SCOPE])
        self.assertEqual(auth["issuer"], BASE)
        self.assertEqual(auth["authorization_endpoint"], BASE + "/oauth/authorize")
        self.assertEqual(auth["token_endpoint"], BASE + "/oauth/token")
        self.assertTrue(auth["client_id_metadata_document_supported"])
        self.assertEqual(auth["token_endpoint_auth_methods_supported"], ["none"])
        self.assertEqual(auth["code_challenge_methods_supported"], ["S256"])
        self.assertEqual(auth["response_modes_supported"], ["query"])
        self.assertTrue(auth["authorization_response_iss_parameter_supported"])

    def test_public_base_url_must_be_origin_without_path(self):
        with self.assertRaises(OAuthError) as ctx:
            OAuthBroker(
                base_url=BASE + "/mcp",
                github_client_id="github-client-id",
                github_client_secret="github-client-secret",
                signing_key="S" * 64,
                cimd_fetcher=lambda _url: cimd(),
                github_identity_fetcher=lambda _code, _redirect: (EXPECTED_GITHUB_USER_ID, "hanmiyoo10-alt"),
            )
        self.assertEqual(ctx.exception.code, "INVALID_PUBLIC_BASE_URL")

    def test_public_base_url_rejects_malformed_origin_spellings(self):
        for base_url in (
            "https://:",
            "https://host:abc",
            "https://host:99999",
            "https://host?",
            "https://host#",
            "https://host/?",
            "https://host\n",
            "https://ho\tst",
            "https://host\r",
            "https://host ",
            "https://ho st",
        ):
            with self.subTest(base_url=base_url):
                with self.assertRaises(OAuthError) as ctx:
                    OAuthBroker(
                        base_url=base_url,
                        github_client_id="github-client-id",
                        github_client_secret="github-client-secret",
                        signing_key="S" * 64,
                        cimd_fetcher=lambda _url: cimd(),
                        github_identity_fetcher=lambda _code, _redirect: (
                            EXPECTED_GITHUB_USER_ID,
                            "hanmiyoo10-alt",
                        ),
                    )
                self.assertEqual(ctx.exception.code, "INVALID_PUBLIC_BASE_URL")

    def test_malformed_cimd_port_is_invalid_client_not_runtime_error(self):
        broker = make_broker()
        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params(
                client_id="https://chatgpt.com:abc/oauth/client.json"
            ))
        self.assertEqual(ctx.exception.code, "invalid_client")

    def test_cimd_fetch_rejects_redirect_responses(self):
        broker = OAuthBroker(
            base_url=BASE,
            github_client_id="github-client-id",
            github_client_secret="github-client-secret",
            signing_key="S" * 64,
            github_identity_fetcher=lambda _code, _redirect: (EXPECTED_GITHUB_USER_ID, "hanmiyoo10-alt"),
        )
        redirect_error = urllib.error.HTTPError(
            CLIENT_ID,
            302,
            "Found",
            {},
            None,
        )
        with patch("repo_admin_mcp.oauth.urllib.request.build_opener") as build_opener:
            build_opener.return_value.open.side_effect = redirect_error
            with self.assertRaises(OAuthError) as ctx:
                broker._fetch_json(CLIENT_ID)
        self.assertEqual(ctx.exception.code, "invalid_client")
        handler = build_opener.call_args.args[0]
        self.assertIsInstance(handler, _RejectRedirects)

    def test_pending_authorizations_are_capacity_bounded(self):
        broker = make_broker(max_pending_authorizations=1)
        first = broker.begin_authorization(auth_params(state="first-state"))
        self.assertTrue(first.startswith("https://github.com/login/oauth/authorize?"))
        second = broker.begin_authorization(auth_params(state="second-state"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(second).query)
        self.assertEqual(query["error"], ["temporarily_unavailable"])
        self.assertEqual(query["state"], ["second-state"])
        self.assertEqual(query["iss"], [BASE])
        self.assertEqual(len(broker._pending), 1)

    def test_authorization_codes_are_capacity_bounded(self):
        broker = make_broker(max_authorization_codes=1)
        first = broker.begin_authorization(auth_params(state="first-state"))
        first_redirect = broker.complete_github_callback({
            "state": callback_state(first),
            "code": "github-code-1",
        })
        self.assertIn("code=", first_redirect)

        second = broker.begin_authorization(auth_params(state="second-state"))
        second_redirect = broker.complete_github_callback({
            "state": callback_state(second),
            "code": "github-code-2",
        })
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(second_redirect).query)
        self.assertEqual(query["error"], ["temporarily_unavailable"])
        self.assertEqual(query["state"], ["second-state"])
        self.assertEqual(query["iss"], [BASE])
        self.assertEqual(len(broker._codes), 1)

    def test_authorize_accepts_only_chatgpt_cimd_and_exact_resource(self):
        broker = make_broker()
        location = broker.begin_authorization(auth_params())
        parsed = urllib.parse.urlsplit(location)
        query = urllib.parse.parse_qs(parsed.query)
        self.assertEqual((parsed.scheme, parsed.netloc, parsed.path), ("https", "github.com", "/login/oauth/authorize"))
        self.assertEqual(query["client_id"], ["github-client-id"])
        self.assertEqual(query["redirect_uri"], [BASE + "/oauth/github/callback"])
        self.assertEqual(query["scope"], ["read:user"])
        self.assertTrue(query["state"][0])

        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params(client_id="https://evil.example/oauth/client.json"))
        self.assertEqual(ctx.exception.code, "invalid_client")

        redirect = broker.begin_authorization(auth_params(resource="https://wrong.example"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["invalid_target"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

    def test_cimd_must_authorize_exact_redirect_and_public_token_method(self):
        broker = make_broker(cimd_payload={
            "redirect_uris": ["https://chatgpt.com/wrong"],
            "token_endpoint_auth_methods_supported": ["none"],
        })
        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params())
        self.assertEqual(ctx.exception.code, "invalid_client")

        broker = make_broker(cimd_payload={
            "redirect_uris": [REDIRECT],
            "token_endpoint_auth_methods_supported": ["private_key_jwt"],
        })
        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params())
        self.assertEqual(ctx.exception.code, "invalid_client")

    def test_cimd_document_client_id_must_exactly_match_requested_url(self):
        broker = make_broker(cimd_payload={
            "client_id": "https://chatgpt.com/oauth/other/client.json",
            "redirect_uris": [REDIRECT],
            "token_endpoint_auth_methods_supported": ["none"],
        })
        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params())
        self.assertEqual(ctx.exception.code, "invalid_client")

        broker = make_broker(cimd_payload={
            "redirect_uris": [REDIRECT],
            "token_endpoint_auth_methods_supported": ["none"],
        })
        with self.assertRaises(OAuthError) as ctx:
            broker.begin_authorization(auth_params())
        self.assertEqual(ctx.exception.code, "invalid_client")

    def test_authorize_rejects_non_s256_and_scope_widening(self):
        broker = make_broker()
        redirect = broker.begin_authorization(auth_params(code_challenge_method="plain"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["invalid_request"])

        redirect = broker.begin_authorization(auth_params(response_mode="fragment"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["unsupported_response_mode"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

        redirect = broker.begin_authorization(auth_params(scope=OAUTH_SCOPE + " extra"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["invalid_scope"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

        redirect = broker.begin_authorization(auth_params(response_type="token"))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["unsupported_response_type"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

    def test_client_redirect_preserves_existing_query_parameters(self):
        redirect_uri = REDIRECT + "?tenant=x"
        broker = make_broker(cimd_payload=cimd(redirect_uri))
        upstream = broker.begin_authorization(auth_params(redirect_uri=redirect_uri))
        client_redirect = broker.complete_github_callback({
            "state": callback_state(upstream),
            "code": "github-code",
        })
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(client_redirect).query)
        self.assertEqual(query["tenant"], ["x"])
        self.assertIn("code", query)
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

        error_redirect = broker.begin_authorization(
            auth_params(redirect_uri=redirect_uri, resource="https://wrong.example")
        )
        error_query = urllib.parse.parse_qs(urllib.parse.urlsplit(error_redirect).query)
        self.assertEqual(error_query["tenant"], ["x"])
        self.assertEqual(error_query["error"], ["invalid_target"])
        self.assertEqual(error_query["state"], ["chatgpt-state"])
        self.assertEqual(error_query["iss"], [BASE])

    def test_github_identity_token_scope_is_exact_minimum(self):
        broker = OAuthBroker(
            base_url=BASE,
            github_client_id="github-client-id",
            github_client_secret="github-client-secret",
            signing_key="S" * 64,
            cimd_fetcher=lambda _url: cimd(),
        )

        class JsonResponse:
            def __init__(self, payload):
                self._payload = payload

            def __enter__(self):
                return self

            def __exit__(self, _exc_type, _exc, _tb):
                return False

            def read(self, _limit):
                return json.dumps(self._payload).encode()

        with patch("repo_admin_mcp.oauth.urllib.request.urlopen") as urlopen:
            urlopen.side_effect = [
                JsonResponse({"access_token": "synthetic", "scope": "read:user"}),
                JsonResponse({"id": EXPECTED_GITHUB_USER_ID, "login": "hanmiyoo10-alt"}),
            ]
            user_id, login = broker._github_identity("code", BASE + "/oauth/github/callback")
        self.assertEqual(user_id, EXPECTED_GITHUB_USER_ID)
        self.assertEqual(login, "hanmiyoo10-alt")

        with patch("repo_admin_mcp.oauth.urllib.request.urlopen") as urlopen:
            urlopen.return_value = JsonResponse({
                "access_token": "synthetic",
                "scope": "read:user,repo",
            })
            with self.assertRaises(OAuthError) as ctx:
                broker._github_identity("code", BASE + "/oauth/github/callback")
        self.assertEqual(ctx.exception.code, "access_denied")

    def test_github_callback_without_code_redirects_error_to_client(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({
            "state": callback_state(upstream),
        })
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["invalid_request"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

    def test_github_identity_is_fixed_to_exact_user_id(self):
        broker = make_broker(user_id=123)
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({
            "state": callback_state(upstream),
            "code": "github-code",
        })
        parsed = urllib.parse.urlsplit(redirect)
        query = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(parsed.scheme + "://" + parsed.netloc + parsed.path, REDIRECT)
        self.assertEqual(query["error"], ["access_denied"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])

    def test_github_identity_exchange_failure_redirects_to_client(self):
        broker = OAuthBroker(
            base_url=BASE,
            github_client_id="github-client-id",
            github_client_secret="github-client-secret",
            signing_key="S" * 64,
            cimd_fetcher=lambda _url: cimd(),
            github_identity_fetcher=lambda _code, _redirect: (_ for _ in ()).throw(
                OAuthError("access_denied", "synthetic upstream detail", http_status=401)
            ),
        )
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({
            "state": callback_state(upstream),
            "code": "github-code",
        })
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(redirect).query)
        self.assertEqual(query["error"], ["access_denied"])
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])
        self.assertNotIn("synthetic upstream detail", redirect)

    def test_full_code_pkce_token_flow_and_one_time_code(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        client_redirect = broker.complete_github_callback({
            "state": callback_state(upstream),
            "code": "github-code",
        })
        parsed = urllib.parse.urlsplit(client_redirect)
        query = urllib.parse.parse_qs(parsed.query)
        self.assertEqual(parsed.scheme + "://" + parsed.netloc + parsed.path, REDIRECT)
        self.assertEqual(query["state"], ["chatgpt-state"])
        self.assertEqual(query["iss"], [BASE])
        code = query["code"][0]

        token = broker.exchange_token({
            "grant_type": "authorization_code",
            "code": code,
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": RESOURCE,
            "code_verifier": VERIFIER,
        })
        self.assertEqual(token["token_type"], "Bearer")
        self.assertEqual(token["scope"], OAUTH_SCOPE)
        claims = broker.verify_access_token(token["access_token"])
        self.assertEqual(claims["iss"], BASE)
        self.assertEqual(claims["aud"], RESOURCE)
        self.assertEqual(claims["resource"], RESOURCE)
        self.assertEqual(claims["sub"], f"github:{EXPECTED_GITHUB_USER_ID}")

        with self.assertRaises(OAuthError) as ctx:
            broker.exchange_token({
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT,
                "resource": RESOURCE,
                "code_verifier": VERIFIER,
            })
        self.assertEqual(ctx.exception.code, "invalid_grant")

    def test_pkce_failure_consumes_authorization_code(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        code = callback_code(redirect)
        with self.assertRaises(OAuthError) as ctx:
            broker.exchange_token({
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT,
                "resource": RESOURCE,
                "code_verifier": "B" * 64,
            })
        self.assertEqual(ctx.exception.code, "invalid_grant")

        with self.assertRaises(OAuthError):
            broker.exchange_token({
                "grant_type": "authorization_code",
                "code": code,
                "client_id": CLIENT_ID,
                "redirect_uri": REDIRECT,
                "resource": RESOURCE,
                "code_verifier": VERIFIER,
            })

    def test_expired_or_wrong_audience_token_fails_closed(self):
        now = [1_800_000_000.0]
        broker = make_broker(now=lambda: now[0])
        bad = jwt.encode({
            "iss": BASE,
            "aud": "https://other.example",
            "sub": f"github:{EXPECTED_GITHUB_USER_ID}",
            "iat": int(now[0]),
            "nbf": int(now[0]) - 1,
            "exp": int(now[0]) + 300,
            "scope": OAUTH_SCOPE,
            "resource": RESOURCE,
        }, "S" * 64, algorithm="HS256")
        with self.assertRaises(OAuthError) as ctx:
            broker.verify_access_token(bad)
        self.assertEqual(ctx.exception.code, "invalid_token")

    def test_challenge_has_resource_metadata_scope_and_bounded_error(self):
        broker = make_broker()
        challenge = broker.challenge(error="invalid_token", description="login required")
        self.assertIn('resource_metadata="' + BASE + '/.well-known/oauth-protected-resource"', challenge)
        self.assertIn('scope="' + OAUTH_SCOPE + '"', challenge)
        self.assertIn('error="invalid_token"', challenge)


class OAuthASGITests(unittest.TestCase):
    def test_well_known_documents_are_anonymous(self):
        app = OAuthMCPApp(InnerApp(), make_broker())
        resource = asyncio.run(run_asgi(app, path="/.well-known/oauth-protected-resource"))
        path_specific = asyncio.run(run_asgi(app, path="/.well-known/oauth-protected-resource/mcp"))
        auth = asyncio.run(run_asgi(app, path="/.well-known/oauth-authorization-server"))
        self.assertEqual(response_status(resource), 200)
        self.assertEqual(response_json(resource)["resource"], RESOURCE)
        self.assertEqual(response_status(path_specific), 404)
        self.assertEqual(response_status(auth), 200)
        self.assertEqual(response_json(auth)["issuer"], BASE)

    def test_unauthenticated_discovery_reaches_inner_app(self):
        inner = InnerApp()
        app = OAuthMCPApp(inner, make_broker())
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).encode()
        messages = asyncio.run(run_asgi(app, path="/mcp", method="POST", body=body))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)
        self.assertEqual(inner.last_body, body)

    def test_unauthenticated_server_discover_reaches_inner_app(self):
        inner = InnerApp()
        app = OAuthMCPApp(inner, make_broker())
        body = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "server/discover",
            "params": {"protocolVersion": "2026-07-28"},
        }).encode()
        messages = asyncio.run(run_asgi(app, path="/mcp", method="POST", body=body))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)
        self.assertEqual(inner.last_body, body)

    def test_http_disconnect_aborts_body_read_without_spinning(self):
        app = OAuthMCPApp(InnerApp(), make_broker())

        async def scenario():
            return await asyncio.wait_for(
                run_disconnect_asgi(app, path="/oauth/token"),
                timeout=0.2,
            )

        messages, receive_calls = asyncio.run(scenario())
        self.assertEqual(messages, [])
        self.assertEqual(receive_calls, 1)

    def test_blocking_cimd_lookup_does_not_block_health(self):
        started = threading.Event()
        release = threading.Event()
        broker = make_broker()

        def slow_begin(_params):
            started.set()
            release.wait(timeout=1.0)
            return "https://github.com/login/oauth/authorize?client_id=x"

        broker.begin_authorization = slow_begin
        app = OAuthMCPApp(InnerApp(), broker)
        query = urllib.parse.urlencode(auth_params())

        async def scenario():
            authorize = asyncio.create_task(
                run_asgi(app, path="/oauth/authorize", query=query)
            )
            deadline = asyncio.get_running_loop().time() + 0.5
            while not started.is_set():
                if asyncio.get_running_loop().time() >= deadline:
                    raise AssertionError("blocking OAuth call did not start")
                await asyncio.sleep(0.005)
            health = await asyncio.wait_for(
                run_asgi(app, path="/health"),
                timeout=0.1,
            )
            release.set()
            authorize_result = await asyncio.wait_for(authorize, timeout=0.5)
            return health, authorize_result

        health, authorize_result = asyncio.run(scenario())
        self.assertEqual(response_status(health), 200)
        self.assertEqual(response_status(authorize_result), 302)

    def test_oauth_io_admission_rejects_excess_waiters_before_gate_queue(self):
        started = threading.Event()
        release = threading.Event()
        broker = make_broker()

        def slow_begin(_params):
            started.set()
            release.wait(timeout=1.0)
            return "https://github.com/login/oauth/authorize?client_id=x"

        broker.begin_authorization = slow_begin
        app = OAuthMCPApp(InnerApp(), broker, oauth_io_capacity=1)
        query = urllib.parse.urlencode(auth_params())

        async def scenario():
            first = asyncio.create_task(run_asgi(app, path="/oauth/authorize", query=query))
            deadline = asyncio.get_running_loop().time() + 0.5
            while not started.is_set():
                if asyncio.get_running_loop().time() >= deadline:
                    raise AssertionError("blocking OAuth call did not start")
                await asyncio.sleep(0.005)
            second = await asyncio.wait_for(
                run_asgi(app, path="/oauth/authorize", query=query),
                timeout=0.1,
            )
            release.set()
            first_result = await asyncio.wait_for(first, timeout=0.5)
            return first_result, second

        first_result, second = asyncio.run(scenario())
        self.assertEqual(response_status(first_result), 302)
        self.assertEqual(response_status(second), 503)
        self.assertEqual(response_json(second)["error"], "temporarily_unavailable")

    def test_unauthenticated_tools_list_mirrors_security_schemes_at_top_level(self):
        inner = ToolsListInner()
        app = OAuthMCPApp(inner, make_broker())
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).encode()
        messages = asyncio.run(run_asgi(app, path="/mcp", method="POST", body=body))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)
        tool = response_json(messages)["result"]["tools"][0]
        expected = [{"type": "oauth2", "scopes": [OAUTH_SCOPE]}]
        self.assertEqual(tool["_meta"]["securitySchemes"], expected)
        self.assertEqual(tool["securitySchemes"], expected)

    def test_unauthenticated_non_string_rpc_method_is_bounded_auth_response(self):
        inner = InnerApp()
        app = OAuthMCPApp(inner, make_broker())
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": [], "params": {}}).encode()
        messages = asyncio.run(run_asgi(app, path="/mcp", method="POST", body=body))
        self.assertEqual(response_status(messages), 401)
        self.assertEqual(response_json(messages)["error"], "unauthorized")
        self.assertEqual(inner.called, 0)

    def test_unauthenticated_tool_call_returns_oauth_challenge_without_invoking_tool(self):
        inner = InnerApp()
        app = OAuthMCPApp(inner, make_broker())
        body = json.dumps({
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {"name": "private_mirror_writer_status", "arguments": {}},
        }).encode()
        messages = asyncio.run(run_asgi(app, path="/mcp", method="POST", body=body))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 0)
        payload = response_json(messages)
        challenge = payload["result"]["_meta"]["mcp/www_authenticate"][0]
        self.assertIn("resource_metadata=", challenge)
        self.assertTrue(payload["result"]["isError"])
        self.assertIn(b"www-authenticate", response_headers(messages))

    def test_authenticated_tools_list_mirrors_security_schemes_at_top_level(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        access = broker.exchange_token({
            "grant_type": "authorization_code",
            "code": callback_code(redirect),
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": BASE,
            "code_verifier": VERIFIER,
        })["access_token"]

        inner = ToolsListInner()
        app = OAuthMCPApp(inner, broker)
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).encode()
        messages = asyncio.run(run_asgi(
            app,
            path="/mcp",
            method="POST",
            body=body,
            headers=[(b"authorization", ("Bearer " + access).encode())],
        ))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)
        tool = response_json(messages)["result"]["tools"][0]
        expected = [{"type": "oauth2", "scopes": [OAUTH_SCOPE]}]
        self.assertEqual(tool["_meta"]["securitySchemes"], expected)
        self.assertEqual(tool["securitySchemes"], expected)

    def test_lowercase_bearer_scheme_is_accepted(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        access = broker.exchange_token({
            "grant_type": "authorization_code",
            "code": callback_code(redirect),
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": RESOURCE,
            "code_verifier": VERIFIER,
        })["access_token"]

        inner = InnerApp()
        app = OAuthMCPApp(inner, broker)
        body = json.dumps({"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {}}).encode()
        messages = asyncio.run(run_asgi(
            app,
            path="/mcp",
            method="POST",
            body=body,
            headers=[(b"authorization", ("bearer " + access).encode())],
        ))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)

    def test_token_response_includes_no_store_and_pragma_no_cache(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        form = urllib.parse.urlencode({
            "grant_type": "authorization_code",
            "code": callback_code(redirect),
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": RESOURCE,
            "code_verifier": VERIFIER,
        }).encode()
        app = OAuthMCPApp(InnerApp(), broker)
        messages = asyncio.run(run_asgi(
            app,
            path="/oauth/token",
            method="POST",
            body=form,
        ))
        headers = response_headers(messages)
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(headers[b"cache-control"], b"no-store")
        self.assertEqual(headers[b"pragma"], b"no-cache")
        self.assertIn("access_token", response_json(messages))

    def test_valid_oauth_token_reaches_mcp_app(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        access = broker.exchange_token({
            "grant_type": "authorization_code",
            "code": callback_code(redirect),
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": RESOURCE,
            "code_verifier": VERIFIER,
        })["access_token"]

        inner = InnerApp()
        app = OAuthMCPApp(inner, broker)
        body = json.dumps({"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {}}).encode()
        messages = asyncio.run(run_asgi(
            app,
            path="/mcp",
            method="POST",
            body=body,
            headers=[(b"authorization", ("Bearer " + access).encode())],
        ))
        self.assertEqual(response_status(messages), 200)
        self.assertEqual(inner.called, 1)

    def test_oversized_authenticated_request_returns_413(self):
        broker = make_broker()
        upstream = broker.begin_authorization(auth_params())
        redirect = broker.complete_github_callback({"state": callback_state(upstream), "code": "github-code"})
        access = broker.exchange_token({
            "grant_type": "authorization_code",
            "code": callback_code(redirect),
            "client_id": CLIENT_ID,
            "redirect_uri": REDIRECT,
            "resource": BASE,
            "code_verifier": VERIFIER,
        })["access_token"]

        inner = InnerApp()
        app = OAuthMCPApp(inner, broker)
        messages = asyncio.run(run_asgi(
            app,
            path="/mcp",
            method="POST",
            body=b"x" * 16385,
            headers=[(b"authorization", ("Bearer " + access).encode())],
        ))
        self.assertEqual(response_status(messages), 413)
        self.assertEqual(response_json(messages)["error"], "invalid_request")
        self.assertEqual(inner.called, 0)

    def test_invalid_bearer_is_401_with_resource_metadata_challenge(self):
        inner = InnerApp()
        app = OAuthMCPApp(inner, make_broker())
        messages = asyncio.run(run_asgi(
            app,
            path="/mcp",
            method="POST",
            body=b"{}",
            headers=[(b"authorization", b"Bearer invalid")],
        ))
        self.assertEqual(response_status(messages), 401)
        self.assertEqual(inner.called, 0)
        challenge = response_headers(messages)[b"www-authenticate"].decode()
        self.assertIn("resource_metadata=", challenge)

    def test_partial_oauth_environment_never_falls_back_to_legacy_bearer(self):
        env = {
            "REPO_ADMIN_MCP_ACCESS_TOKEN": "legacy-secret",
            "REPO_ADMIN_OAUTH_PUBLIC_BASE_URL": BASE,
        }
        with patch.dict("os.environ", env, clear=True):
            with self.assertRaisesRegex(RuntimeError, "PARTIAL_OAUTH_CONFIGURATION"):
                build_http_app()


class OAuthToolAndPluginContractTests(unittest.TestCase):
    def test_legacy_tool_catalog_does_not_advertise_oauth(self):
        tools = asyncio.run(mcp.list_tools())
        self.assertEqual(len(tools), 4)
        for tool in tools:
            meta = tool.meta or {}
            self.assertNotIn("securitySchemes", meta)

    def test_distribution_and_runtime_versions_match(self):
        self.assertEqual(importlib.metadata.version("repo-admin-mcp"), "0.2.0")
        self.assertEqual(__version__, "0.2.0")
        plugin_root = Path(__file__).resolve().parents[1] / "plugin-src"
        for relative in ("plugin.json", ".codex-plugin/plugin.json"):
            payload = json.loads((plugin_root / relative).read_text(encoding="utf-8"))
            self.assertEqual(payload["version"], "0.2.0")

    def test_plugin_mcp_source_declares_cimd_oauth_without_credentials(self):
        path = Path(__file__).resolve().parents[1] / "plugin-src" / "mcp.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        server = payload["mcpServers"]["repo-admin"]
        self.assertEqual(server["type"], "streamable-http")
        self.assertEqual(server["url"], BASE + "/mcp")
        auth = server["extensions"]["com.openai"]["auth"]
        self.assertEqual(auth, {"type": "oauth", "client": {"mode": "cimd"}})
        rendered = path.read_text(encoding="utf-8").lower()
        for forbidden in ("clientsecret", "client_secret", "access_token", "private key", "github_pat_", "ghp_"):
            self.assertNotIn(forbidden, rendered)


if __name__ == "__main__":
    unittest.main()
