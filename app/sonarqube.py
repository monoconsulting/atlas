"""
SonarQube Integration Module for Atlas
Handles code analysis, project setup, and result retrieval
"""
import os
import json
import subprocess
import logging
import shutil
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

class SonarQubeManager:
    """Manages SonarQube operations for projects"""
    
    def __init__(self, sonar_url: str = "http://atlas_sonarqube:9000", sonar_token: Optional[str] = None):
        self.sonar_url = sonar_url
        self.sonar_token = sonar_token or os.getenv("SONAR_TOKEN", "sqp_7762c5fce65de5eeca7a42668b23b4abe0c2dd7d")
        self.auth = HTTPBasicAuth(self.sonar_token, "")
        
    def check_sonarqube_status(self) -> Dict:
        """Check if SonarQube is running and accessible"""
        try:
            # Add Host header for container-to-container communication
            headers = {"Host": "localhost"}
            response = requests.get(f"{self.sonar_url}/api/system/status", headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "running": data.get("status") == "UP",
                    "version": data.get("version", "Unknown"),
                    "status": data.get("status")
                }
        except Exception as e:
            logger.error(f"SonarQube status check failed: {e}")
            return {"running": False, "status": "DOWN", "error": str(e)}
    
    def create_user_token(self, username: str = "admin", password: str = "admin") -> Optional[str]:
        """Create a user token for API access if none exists"""
        try:
            headers = {"Host": "localhost"}
            
            # Try to create a token using basic auth
            token_name = f"taskmaster-{int(time.time())}"
            response = requests.post(
                f"{self.sonar_url}/api/user_tokens/generate",
                auth=(username, password),
                headers=headers,
                data={"name": token_name},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("token")
                if token:
                    logger.info(f"Created new SonarQube token: {token_name}")
                    return token
                    
        except Exception as e:
            logger.error(f"Failed to create SonarQube token: {e}")
            
        return None
    
    def ensure_token(self) -> bool:
        """Ensure we have a valid token, create one if needed"""
        # If we already have a token from env, test it
        if self.sonar_token and self.sonar_token.startswith("sqp_"):
            try:
                headers = {"Host": "localhost"}
                response = requests.get(
                    f"{self.sonar_url}/api/authentication/validate",
                    auth=HTTPBasicAuth(self.sonar_token, ""),
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 200 and response.json().get("valid"):
                    return True
            except Exception:
                pass
        
        # Try to create a new token
        new_token = self.create_user_token()
        if new_token:
            self.sonar_token = new_token
            self.auth = HTTPBasicAuth(self.sonar_token, "")
            return True
            
        return False
    
    def install_scanner(self) -> bool:
        """Install SonarQube Scanner if not present"""
        scanner_path = shutil.which("sonar-scanner")
        if scanner_path:
            logger.info(f"SonarQube Scanner found at: {scanner_path}")
            return True
        
        try:
            # Download SonarQube Scanner directly
            logger.info("Downloading SonarQube Scanner...")
            scanner_dir = Path("/tmp/sonar-scanner")
            scanner_dir.mkdir(exist_ok=True)
            
            # Download the CLI zip file
            import urllib.request
            scanner_url = "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip"
            zip_path = scanner_dir / "sonar-scanner.zip"
            
            urllib.request.urlretrieve(scanner_url, zip_path)
            
            # Extract the scanner
            import zipfile
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(scanner_dir)
            
            # Find the extracted directory and create symlink
            extracted_dirs = [d for d in scanner_dir.iterdir() if d.is_dir() and d.name.startswith("sonar-scanner")]
            if extracted_dirs:
                scanner_bin = extracted_dirs[0] / "bin" / "sonar-scanner"
                if scanner_bin.exists():
                    # Make it executable and create symlink
                    scanner_bin.chmod(0o755)
                    
                    # Create symlink to /usr/local/bin
                    symlink_path = Path("/usr/local/bin/sonar-scanner")
                    if symlink_path.exists():
                        symlink_path.unlink()
                    symlink_path.symlink_to(scanner_bin)
                    
                    logger.info("SonarQube Scanner installed successfully")
                    return True
            
            logger.error("Failed to find scanner binary after extraction")
            return False
            
        except Exception as e:
            logger.error(f"Failed to install scanner: {e}")
            return False
    
    def create_project_config(self, project_path: str, project_key: str, project_name: str, scanner_url: str = None) -> str:
        """Create sonar-project.properties for a project"""
        config_path = Path(project_path) / "sonar-project.properties"
        
        # Use scanner-specific URL if provided, otherwise use default
        # DEBUG: Write debug info to file
        with open("/tmp/debug_sonar.log", "a") as f:
            f.write(f"create_project_config called with scanner_url: {scanner_url}\n")
        sonar_host_url = scanner_url or self.sonar_url
        with open("/tmp/debug_sonar.log", "a") as f:
            f.write(f"Final sonar_host_url: {sonar_host_url}\n")
        
        config_content = f"""# SonarQube Configuration for {project_name}
sonar.projectKey={project_key}
sonar.projectName={project_name}
sonar.projectVersion=1.0

# Source code directories
sonar.sources=.

# Exclusions - files and directories to ignore during analysis
sonar.exclusions=**/node_modules/**,\\
    **/test-results/**,\\
    **/test-reports/**,\\
    **/_backup/**,\\
    **/legacy/**,\\
    **/*.min.js,\\
    **/dist/**,\\
    **/build/**,\\
    **/.git/**,\\
    **/.taskmaster/**,\\
    **/venv/**,\\
    **/__pycache__/**,\\
    **/coverage/**,\\
    **/playwright-report/**

# Test file patterns
sonar.test.inclusions=**/*test.js,**/*spec.js,**/tests/**,**/*test.py,**/*_test.py

# Language-specific settings
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.python.coverage.reportPaths=coverage.xml
sonar.python.xunit.reportPath=test-results/*.xml

# Additional settings
sonar.sourceEncoding=UTF-8
sonar.host.url={sonar_host_url}
"""
        
        try:
            config_path.write_text(config_content, encoding='utf-8')
            logger.info(f"Created SonarQube config at: {config_path}")
            return str(config_path)
        except Exception as e:
            logger.error(f"Failed to create config: {e}")
            raise
    
    def run_analysis(self, project_path: str, project_key: str, project_name: str) -> Dict:
        """Run SonarQube analysis for a project"""
        result = {
            "success": False,
            "project_key": project_key,
            "message": "",
            "scan_time": datetime.now().isoformat(),
            "log_file": None
        }
        
        # Ensure scanner is installed
        if not self.install_scanner():
            result["message"] = "Failed to install SonarQube Scanner"
            return result
        
        # Create project config with scanner-specific URL 
        # Use external port for scanner connectivity (hardcoded for now)
        scanner_sonar_url = "http://host.docker.internal:9010"
        with open("/tmp/debug_sonar.log", "a") as f:
            f.write(f"run_analysis: scanner_sonar_url={scanner_sonar_url}\n")
        try:
            config_path = self.create_project_config(project_path, project_key, project_name, scanner_sonar_url)
        except Exception as e:
            result["message"] = f"Failed to create config: {e}"
            return result
        
        # Run analysis
        log_file = Path(project_path) / ".sonarqube" / f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            logger.info(f"Starting SonarQube analysis for {project_name}...")
            
            # Prepare command (URL is configured in sonar-project.properties)
            cmd = [
                "sonar-scanner",
                f"-Dsonar.login={self.sonar_token}",
                f"-Dsonar.projectBaseDir={project_path}"
            ]
            
            # Run scanner with JAVA_HOME set
            env = os.environ.copy()
            env['JAVA_HOME'] = '/usr/lib/jvm/java-21-openjdk-amd64'
            env['PATH'] = f"/usr/lib/jvm/java-21-openjdk-amd64/bin:/usr/bin:{env.get('PATH', '')}"
            
            with open(log_file, 'w') as log:
                process = subprocess.Popen(
                    cmd,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    text=True,
                    cwd=project_path,
                    env=env
                )
                
                # Wait for completion (timeout after 5 minutes)
                process.wait(timeout=300)
                
            if process.returncode == 0:
                result["success"] = True
                result["message"] = "Analysis completed successfully"
                result["log_file"] = str(log_file)
                logger.info(f"Analysis successful for {project_name}")
            else:
                result["message"] = f"Analysis failed with code {process.returncode}"
                result["log_file"] = str(log_file)
                logger.error(f"Analysis failed for {project_name}")
                
        except subprocess.TimeoutExpired:
            result["message"] = "Analysis timed out after 5 minutes"
            process.kill()
        except Exception as e:
            result["message"] = f"Analysis error: {e}"
            logger.error(f"Analysis error for {project_name}: {e}")
        
        return result
    
    def get_project_metrics(self, project_key: str) -> Dict:
        """Get analysis metrics for a project"""
        # Ensure we have a valid token
        if not self.ensure_token():
            return {"project_key": project_key, "error": "Failed to authenticate with SonarQube", "status": "error"}
            
        try:
            headers = {"Host": "localhost"}
            
            # Get project status
            status_url = f"{self.sonar_url}/api/qualitygates/project_status"
            status_response = requests.get(
                status_url,
                params={"projectKey": project_key},
                auth=self.auth,
                headers=headers,
                timeout=10
            )
            
            # Get issues summary
            issues_url = f"{self.sonar_url}/api/issues/search"
            issues_response = requests.get(
                issues_url,
                params={
                    "componentKeys": project_key,
                    "resolved": "false",
                    "ps": 1  # Just get count
                },
                auth=self.auth,
                headers=headers,
                timeout=10
            )
            
            # Get measures
            measures_url = f"{self.sonar_url}/api/measures/component"
            metrics = "bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,security_hotspots"
            measures_response = requests.get(
                measures_url,
                params={
                    "component": project_key,
                    "metricKeys": metrics
                },
                auth=self.auth,
                headers=headers,
                timeout=10
            )
            
            result = {
                "project_key": project_key,
                "status": "unknown",
                "issues": {
                    "total": 0,
                    "blockers": 0,
                    "critical": 0,
                    "major": 0
                },
                "metrics": {},
                "last_analysis": None,
                "quality_gate": "NONE"
            }
            
            # Parse status
            if status_response.status_code == 200:
                status_data = status_response.json()
                result["quality_gate"] = status_data.get("projectStatus", {}).get("status", "NONE")
            
            # Parse issues
            if issues_response.status_code == 200:
                issues_data = issues_response.json()
                result["issues"]["total"] = issues_data.get("total", 0)
                
                # Get issue severities
                for issue in issues_data.get("issues", []):
                    severity = issue.get("severity", "").lower()
                    if severity == "blocker":
                        result["issues"]["blockers"] += 1
                    elif severity == "critical":
                        result["issues"]["critical"] += 1
                    elif severity == "major":
                        result["issues"]["major"] += 1
            
            # Parse measures
            if measures_response.status_code == 200:
                measures_data = measures_response.json()
                for measure in measures_data.get("component", {}).get("measures", []):
                    metric = measure.get("metric")
                    value = measure.get("value")
                    if metric and value:
                        result["metrics"][metric] = value
            
            # Get blocker issues details
            blockers_response = requests.get(
                issues_url,
                params={
                    "componentKeys": project_key,
                    "severities": "BLOCKER",
                    "resolved": "false",
                    "ps": 100
                },
                auth=self.auth,
                headers=headers,
                timeout=10
            )
            
            if blockers_response.status_code == 200:
                blockers_data = blockers_response.json()
                result["issues"]["blockers"] = blockers_data.get("total", 0)
                result["blocker_details"] = [
                    {
                        "message": issue.get("message"),
                        "component": issue.get("component", "").split(":")[-1],
                        "line": issue.get("line"),
                        "rule": issue.get("rule")
                    }
                    for issue in blockers_data.get("issues", [])[:10]  # Limit to 10
                ]
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get metrics for {project_key}: {e}")
            return {
                "project_key": project_key,
                "error": str(e),
                "status": "error"
            }
    
    def get_project_url(self, project_key: str) -> str:
        """Get SonarQube dashboard URL for a project"""
        return f"{self.sonar_url}/dashboard?id={project_key}"