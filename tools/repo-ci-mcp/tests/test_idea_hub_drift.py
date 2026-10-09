from __future__ import annotations

import copy
import json
import unittest

from repo_ci_mcp.idea_hub_drift import classify_idea_hub_drift

OWNERS = [
    3396, 3397, 3399, 3400, 3401, 3402, 3403, 3404, 3405, 3406,
    3409, 3410, 3411, 3412, 3413, 3414, 3415, 3417, 3418, 3419,
    3420, 3421, 3422,
]

DURABLE = {
    "docs/AGENT_SKILL_MULTI_MODEL_ORCHESTRATION_MILESTONE_ROADMAP_2026-09-02.md": (3410, "Agent Platform"),
    "docs/PLUGIN_SHARED_PRIMITIVE_CANDIDATES.md": (3404, "Local Shared"),
    "docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md": (3397, "SimCore"),
    "docs/SIMCORE_SYSTEM_IDEA_CANDIDATE_INVENTORY_2026-08-26.md": (3397, "SimCore"),
    "docs/USAGE_DASHBOARD_IDEA_LIST.md": (3399, "Local Usage Dashboard"),
    "docs/USAGE_DASHBOARD_RELEASE_INFRASTRUCTURE_BACKLOG.md": (3399, "Local Usage Dashboard"),
    "docs/USAGE_DASHBOARD_RUNTIME_SLIMMING_BACKLOG.md": (3399, "Local Usage Dashboard"),
    "products/chatgpt-mobile-coder-lab/docs/OPERATIONS_BACKLOG.md": (3401, "Mobile Coder Lab"),
    "products/chatgpt-mobile-coder-lab/docs/candidates.md": (3401, "Mobile Coder Lab"),
    "products/pocketrisu-helper-mod/ROADMAP.md": (3400, "PocketRisu"),
    "products/pocketrisu-helper-mod/docs/IDEA_LIST_WORKING.md": (3400, "PocketRisu"),
}

EXCEPTIONS = {
    "docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md": "HISTORICAL_OR_SUPERSEDED",
    "docs/SIMCORE_LIGHTBOARD_ONLY_IDEA_CATALOG_2026-09-01.md": "DERIVED_OR_SUPPORTING",
    "docs/SIMCORE_SMALL_IDEA_STARTER_MENU_2026-08-26.md": "HISTORICAL_OR_SUPERSEDED",
    "products/app-api-mod-lab/legacy-candidates.json": "EMPTY_OR_LOCATOR_ONLY",
}


def baseline():
    bodies = {number: "SOURCE_LINKED / PROJECTION\n" for number in OWNERS}
    known = []
    files = []
    for path, (number, category) in DURABLE.items():
        files.append(path)
        bodies[number] += path + "\n"
        known.append(
            {
                "path": path,
                "classification": "DURABLE_SOURCE",
                "discussionNumber": number,
                "ownerCategory": category,
            }
        )
    for path, classification in EXCEPTIONS.items():
        files.append(path)
        known.append({"path": path, "classification": classification})

    discussions = [
        {
            "number": number,
            "title": f"owner {number} - source-linked projection",
            "category": next(
                (category for _, (owner, category) in DURABLE.items() if owner == number),
                f"owner-{number}",
            ),
            "body": bodies[number],
        }
        for number in OWNERS
    ]
    root_body = "\n".join(
        f"https://github.com/hanmiyoo10-alt/-/discussions/{number}"
        for number in OWNERS
    )
    discussions.append(
        {
            "number": 3387,
            "title": "Repository Idea Hub - navigation index",
            "category": "Idea Hub & Routing",
            "body": root_body,
        }
    )
    return {
        "schemaVersion": 1,
        "repositoryRef": "f" * 40,
        "files": files,
        "knownSources": known,
        "discussions": discussions,
        "navigation": {
            "rootDiscussionNumber": 3387,
            "owningDiscussionNumbers": OWNERS,
        },
    }


class IdeaHubDriftTests(unittest.TestCase):
    def test_completed_idea_hub_fixture_passes(self):
        out = classify_idea_hub_drift(baseline())
        self.assertEqual(out["result"], "PASS")
        self.assertEqual(out["candidateCount"], len(DURABLE) + len(EXCEPTIONS))
        self.assertEqual(out["sourceClassCounts"]["DURABLE_SOURCE"], len(DURABLE))
        self.assertEqual(out["sourceClassCounts"]["EMPTY_OR_LOCATOR_ONLY"], 1)
        self.assertEqual(out["findings"], [])

    def test_missing_required_backlink_is_drift(self):
        payload = baseline()
        target = "products/pocketrisu-helper-mod/ROADMAP.md"
        discussion = next(item for item in payload["discussions"] if item["number"] == 3400)
        discussion["body"] = discussion["body"].replace(target, "")
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "DRIFT")
        self.assertIn(
            "DURABLE_SOURCE_BACKLINK_MISSING",
            [item["code"] for item in out["findings"]],
        )

    def test_unreviewed_new_roadmap_is_unknown_not_invented_owner(self):
        payload = baseline()
        payload["files"].append("products/new-product/ROADMAP.md")
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "UNKNOWN")
        finding = next(
            item for item in out["findings"]
            if item["code"] == "UNCLASSIFIED_SOURCE_CANDIDATE"
        )
        self.assertEqual(finding["sourceRef"], "products/new-product/ROADMAP.md")
        self.assertNotIn("discussionNumber", finding)
        self.assertNotIn("ownerCategory", finding)

    def test_known_non_omissions_remain_non_drift(self):
        payload = baseline()
        payload["knownSources"] = [
            source for source in payload["knownSources"]
            if source["path"] in EXCEPTIONS
        ]
        payload["files"] = list(EXCEPTIONS)
        payload["navigation"] = None
        payload["discussions"] = []
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "PASS")
        self.assertEqual(out["reviewedSourceCount"], 4)
        self.assertEqual(out["sourceClassCounts"]["HISTORICAL_OR_SUPERSEDED"], 2)
        self.assertEqual(out["sourceClassCounts"]["DERIVED_OR_SUPPORTING"], 1)
        self.assertEqual(out["sourceClassCounts"]["EMPTY_OR_LOCATOR_ONLY"], 1)

    def test_navigation_missing_owner_link_is_drift(self):
        payload = baseline()
        root = next(item for item in payload["discussions"] if item["number"] == 3387)
        root["body"] = root["body"].replace(
            "/discussions/3422",
            "/not-discussions/3422",
        )
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "DRIFT")
        self.assertIn(
            "NAVIGATION_OWNER_LINK_MISSING",
            [item["code"] for item in out["findings"]],
        )

    def test_explicit_review_request_is_warn(self):
        payload = baseline()
        payload["knownSources"][0]["reviewRequired"] = True
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "WARN")
        self.assertIn(
            "DURABLE_SOURCE_REVIEW_REQUESTED",
            [item["code"] for item in out["findings"]],
        )

    def test_discussion_body_content_is_not_echoed(self):
        payload = baseline()
        secret = "ghp_example_should_never_be_emitted"
        discussion = next(item for item in payload["discussions"] if item["number"] == 3400)
        discussion["body"] += "\n" + secret
        discussion["body"] = discussion["body"].replace(
            "products/pocketrisu-helper-mod/ROADMAP.md",
            "",
        )
        out = classify_idea_hub_drift(payload)
        self.assertEqual(out["result"], "DRIFT")
        self.assertNotIn(secret, json.dumps(out, ensure_ascii=False))

    def test_output_is_deterministic(self):
        payload = baseline()
        payload["files"].append("products/new-product/ROADMAP.md")
        first = classify_idea_hub_drift(copy.deepcopy(payload))
        second = classify_idea_hub_drift(copy.deepcopy(payload))
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
