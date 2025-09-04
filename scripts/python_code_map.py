import os
import ast
from pathlib import Path


def iter_python_files(base: Path):
    for p in base.rglob("*.py"):
        if ".venv" in p.parts or "node_modules" in p.parts:
            continue
        yield p


def module_name(base: Path, file_path: Path) -> str:
    rel = file_path.relative_to(base)
    parts = list(rel.with_suffix("").parts)
    return ".".join(parts)


def collect_module_info(base: Path):
    modules = {}
    for file_path in iter_python_files(base):
        mod = module_name(base, file_path)
        try:
            tree = ast.parse(file_path.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            # Skip files that can't be parsed
            continue

        imports = set()
        classes = []
        functions = []
        calls = {}  # func_name -> set(called_name)

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    imports.add(n.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split(".")[0])

        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                classes.append(node.name)
            elif isinstance(node, ast.FunctionDef):
                functions.append(node.name)
                called = set()
                for sub in ast.walk(node):
                    if isinstance(sub, ast.Call):
                        # foo() or pkg.func()
                        if isinstance(sub.func, ast.Name):
                            called.add(sub.func.id)
                        elif isinstance(sub.func, ast.Attribute):
                            # capture attribute tail
                            called.add(sub.func.attr)
                calls[node.name] = called

        modules[mod] = {
            "file": str(file_path),
            "imports": sorted(imports),
            "classes": sorted(classes),
            "functions": sorted(functions),
            "calls": {k: sorted(v) for k, v in calls.items()},
        }
    return modules


def write_component_puml(modules, out_path: Path):
    lines = []
    lines.append("@startuml")
    lines.append("skinparam componentStyle rectangle")
    lines.append("skinparam shadowing false")
    lines.append("skinparam defaultFontName Arial")

    # Declare components
    for mod in sorted(modules.keys()):
        alias = mod.replace(".", "_")
        lines.append(f"[" + mod + f"] as {alias}")

    # Import edges (only within our base package if applicable)
    base_roots = {k.split(".")[0] for k in modules.keys()}
    for mod, info in modules.items():
        src = mod.replace(".", "_")
        for imp in info["imports"]:
            # Only draw edges to modules that exist in our set
            # Match by top-level package name first
            targets = [m for m in modules.keys() if m.split(".")[0] == imp]
            for tgt in targets:
                dst = tgt.replace(".", "_")
                if src != dst:
                    lines.append(f"{src} --> {dst} : import")

    # Notes with classes/functions
    for mod, info in modules.items():
        alias = mod.replace(".", "_")
        details = []
        if info["classes"]:
            details.append("Classes: " + ", ".join(info["classes"]))
        if info["functions"]:
            details.append("Funcs: " + ", ".join(info["functions"]))
        if details:
            lines.append("note right of " + alias)
            for d in details:
                lines.append("  " + d)
            lines.append("end note")

    lines.append("@enduml")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def write_summary_md(modules, out_path: Path):
    lines = []
    lines.append("# Python Code Map (app)")
    for mod in sorted(modules.keys()):
        info = modules[mod]
        lines.append(f"\n## {mod}")
        lines.append(f"- File: `{info['file']}`")
        if info["classes"]:
            lines.append("- Classes: " + ", ".join(info["classes"]))
        if info["functions"]:
            lines.append("- Functions: " + ", ".join(info["functions"]))
        if info["imports"]:
            lines.append("- Imports: " + ", ".join(info["imports"]))
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main():
    base = Path("app").resolve()
    out_dir = Path("docs/architecture")
    out_dir.mkdir(parents=True, exist_ok=True)
    modules = collect_module_info(base)
    write_component_puml(modules, out_dir / "python-modules.puml")
    write_summary_md(modules, out_dir / "python-functions.md")


if __name__ == "__main__":
    main()

