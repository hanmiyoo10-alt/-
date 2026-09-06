from __future__ import annotations

import asyncio
import sys
import unittest

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


TARGET_TOOL = "simcore_branch_pr_relationship_audit"


class RealProtocolSmokeTests(unittest.TestCase):
    def test_stdio_handshake_lists_and_dispatches_sys36_tool(self) -> None:
        async def scenario() -> None:
            server = StdioServerParameters(
                command=sys.executable,
                args=["-m", "simcore_mcp.server"],
                env={
                    "SIMCORE_GITHUB_API": "http://127.0.0.1:9",
                    "SIMCORE_GITHUB_TIMEOUT_SECONDS": "1",
                },
            )

            async with stdio_client(server) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    listed = await session.list_tools()
                    names = {tool.name for tool in listed.tools}
                    self.assertIn(TARGET_TOOL, names)

                    result = await session.call_tool(
                        TARGET_TOOL,
                        arguments={
                            "pr_number": 1,
                            "mode": "INVALID",
                            "include_compare": False,
                        },
                    )

                    self.assertFalse(result.is_error, result.content)
                    self.assertIsInstance(result.structured_content, dict)
                    payload = result.structured_content
                    assert isinstance(payload, dict)
                    self.assertEqual(payload.get("disposition"), "RELATION_NOT_APPLICABLE")
                    self.assertEqual(payload.get("pr"), {"number": 1})
                    self.assertEqual(payload.get("errors"), [])
                    findings = payload.get("findings")
                    self.assertIsInstance(findings, list)
                    assert isinstance(findings, list)
                    self.assertTrue(findings)
                    self.assertEqual(findings[0].get("code"), "BRF-13")

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()
