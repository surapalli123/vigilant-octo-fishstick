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

def list_user_prs(github_instance):
    """List all open pull requests for the authenticated user."""
    user = github_instance.get_user()
    prs = []
    for repo in user.get_repos():
        for pr in repo.get_pulls(state='open'):
            prs.append(f"{pr.title} (#{pr.number}) in {repo.name}")
    return prs
