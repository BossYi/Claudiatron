"""
Repository manager module for downloading and cloning Git repositories.

This module handles cloning repositories from various Git hosting services
Only including Aone.
"""

import os
import subprocess
import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)

def download_repo(repo_url: str, local_path: str, type: str = "aone", access_token: str = None) -> str:
    """
    Downloads a Git repository from Aone to a specified local path.

    Args:
        repo_url (str): The URL of the Git repository to clone.
        local_path (str): The local directory where the repository will be cloned.
        type (str): The type of the repository ("aone").
        access_token (str, optional): Access token for private repositories.

    Returns:
        str: The output message from the `git` command.
    """
    try:
        # Check if Git is installed
        logger.info(f"Preparing to clone repository to {local_path}")
        subprocess.run(
            ["git", "--version"],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Check if repository already exists
        if os.path.exists(local_path) and os.listdir(local_path):
            # Directory exists and is not empty
            logger.warning(f"Repository already exists at {local_path}. Using existing repository.")
            return f"Using existing repository at {local_path}"

        # Ensure the local path exists
        os.makedirs(local_path, exist_ok=True)

        # Prepare the clone URL with access token if provided
        clone_url = repo_url
        if access_token:
            parsed = urlparse(repo_url)
            # Determine the repository type and format the URL accordingly
            if type == "aone":
                # Format: https://{域账号}:{private-token}@code.alibaba-inc.com/foo/bar.git
                # access_token is expected to be "{域账号}:{private-token}"
                clone_url = urlunparse((parsed.scheme, f"{access_token}@{parsed.netloc}", parsed.path, '', '', ''))
            logger.info("Using access token for authentication")

        # Clone the repository
        logger.info(f"Cloning repository from {repo_url} to {local_path}")
        # We use repo_url in the log to avoid exposing the token in logs
        result = subprocess.run(
            ["git", "clone", "--depth", "1", clone_url, local_path],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        logger.info("Repository cloned successfully")
        return result.stdout.decode("utf-8")

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8')
        # Sanitize error message to remove any tokens
        if access_token:
            # More robust token sanitization for different token formats
            sanitized_msg = error_msg
            if ":" in access_token: # For tokens like "user:token"
                parts = access_token.split(":", 1)
                for part in parts:
                    if part in sanitized_msg:
                        sanitized_msg = sanitized_msg.replace(part, "***TOKEN_PART***")
            elif access_token in sanitized_msg: # For simple tokens
                 sanitized_msg = sanitized_msg.replace(access_token, "***TOKEN***")
            error_msg = sanitized_msg
        raise ValueError(f"Error during cloning: {error_msg}")
    except Exception as e:
        raise ValueError(f"An unexpected error occurred: {str(e)}")

# Alias for backward compatibility
download_github_repo = download_repo 