from __future__ import annotations

REPOSITORY_OWNER = "hanmiyoo10-alt"
REPOSITORY_NAME = "-"
REPOSITORY_FULL_NAME = "hanmiyoo10-alt/-"
GRAPHQL_ENDPOINT = "https://api.github.com/graphql"

_CATEGORY_FIELDS = """
id
name
slug
description
isAnswerable
createdAt
updatedAt
"""

_DISCUSSION_LIST_FIELDS = """
id
number
title
updatedAt
closed
viewerCanUpdate
url
category {
  id
  name
  slug
}
"""

_DISCUSSION_FULL_FIELDS = """
id
number
title
body
updatedAt
closed
viewerCanUpdate
url
category {
  id
  name
  slug
}
"""

CATEGORIES_QUERY = f"""
query RepoDiscussionCategories($owner: String!, $name: String!) {{
  repository(owner: $owner, name: $name) {{
    id
    hasDiscussionsEnabled
    discussionCategories(first: 100) {{
      nodes {{
        {_CATEGORY_FIELDS}
      }}
      pageInfo {{
        hasNextPage
        endCursor
      }}
    }}
  }}
}}
""".strip()

DISCUSSIONS_LIST_QUERY = f"""
query RepoDiscussions($owner: String!, $name: String!, $first: Int!, $after: String) {{
  repository(owner: $owner, name: $name) {{
    id
    hasDiscussionsEnabled
    discussions(
      first: $first
      after: $after
      orderBy: {{field: UPDATED_AT, direction: DESC}}
    ) {{
      nodes {{
        {_DISCUSSION_LIST_FIELDS}
      }}
      pageInfo {{
        hasNextPage
        endCursor
      }}
    }}
  }}
}}
""".strip()

DISCUSSION_GET_QUERY = f"""
query RepoDiscussion($owner: String!, $name: String!, $number: Int!) {{
  repository(owner: $owner, name: $name) {{
    id
    hasDiscussionsEnabled
    discussion(number: $number) {{
      {_DISCUSSION_FULL_FIELDS}
    }}
  }}
}}
""".strip()

DISCUSSION_UPDATE_MUTATION = f"""
mutation GuardedUpdateDiscussion($input: UpdateDiscussionInput!) {{
  updateDiscussion(input: $input) {{
    discussion {{
      {_DISCUSSION_FULL_FIELDS}
    }}
  }}
}}
""".strip()

ALLOWED_DOCUMENTS = frozenset(
    {
        CATEGORIES_QUERY,
        DISCUSSIONS_LIST_QUERY,
        DISCUSSION_GET_QUERY,
        DISCUSSION_UPDATE_MUTATION,
    }
)
