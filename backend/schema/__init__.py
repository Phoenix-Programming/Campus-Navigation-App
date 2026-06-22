from importlib import import_module
from pathlib import Path
from pkgutil import iter_modules

# locate the current package directory
package_dir: str = str(Path(__file__).resolve().parent)

# initialize or fetch the __all__ list
if "__all__" not in globals():
    globals()["__all__"] = []

# iterate through all Python files in this directory
for module_info in iter_modules([package_dir]):
    module_name = module_info.name

    # dynamically import the module relative to the package name
    module = import_module(f".{module_name}", package=__name__)

    # determine the public attributes of the imported script
    if hasattr(module, "__all__"):
        attrs = module.__all__
    else:
        # Fallback: get all names that don't start with an underscore
        attrs = [name for name in dir(module) if not name.startswith("_")]

    # inject the attributes into the __init__.py namespace and __all__
    for attr in attrs:
        if attr not in globals():
            globals()[attr] = getattr(module, attr)
            globals()["__all__"].append(attr)
