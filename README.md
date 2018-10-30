# vue-compiler
Simple and fast Vue 2 template compiler that uses the reference template compiler.

# Usage
    npm i -g @vialer/vue-compiler
    # produces a commonjs module like `module.exports.tabs_TabList`
    vc -i '../tabs/src/*.vue' -s src -c

# Options
    --namespace, -n  changes the default namespace.                         [text]
    -c, --commonjs   use commonjs format                [boolean] [default: false]
    -i, --input      glob pattern to vue templates.              [text] [required]
    -o, --output     output file to use.                                    [text]
    -s, --skip       skip parts of the template path to name.              [lijst]
    -h               Show help                                           [boolean]
