from github import Github

def authenticate_github(token):
    """Authenticate using a GitHub Personal Access Token."""
    return Github(token)

def list_user_repos(github_instance):
    """List all repositories for the authenticated user."""
    return [repo.name for repo in github_instance.get_user().get_repos()]

def list_user_issues(github_instance):
    """List all open issues assigned to the authenticated user."""
    issues = github_instance.get_user().get_issues(state='open')
    return [f"{issue.title} (#{issue.number})" for issue in issues]

def list_user_prs(github_instance, state="open"):
    """List pull requests for the authenticated user by state."""
    user = github_instance.get_user()
    query = f"is:pr is:{state} author:{user.login}"
    search_results = github_instance.search_issues(query=query)
    prs = [
        f"{issue.title} (#{issue.number}) in {issue.repository.full_name}"
        for issue in search_results
    ]
    return prs
