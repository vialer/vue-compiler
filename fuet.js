#!/usr/bin/env node
const compiler = require('vue-template-compiler')
const glob = require('glob')

const fs = require('fs')
const os = require('os')
const path = require('path')
const transpile = require('vue-template-es2015-compiler')

let vueOptions = {
    preserveWhitespace: false,
}

let namespace = 'window.templates'

let yargs = require('yargs')
    .option('namespace', {
        alias: 'n',
        describe: 'changes the default namespace.',
        type: 'string',
    })
    .usage('Usage: $0 <command> [options]')
    .example('$0 -i **/*.vue -o templates.js', 'write templates using global namespace.')
    .epilog('Devhouse Spindle, https://wearespindle.com')
    .alias('c', 'commonjs')
    .describe('c', 'use commonjs format')
    .boolean('c')
    .default('c', false)
    .alias('i', 'input')
    .describe('i', 'glob pattern to vue templates.')
    .string('i')
    .alias('o', 'output')
    .describe('o', 'output file to use.')
    .string('o')
    .alias('s', 'skip')
    .describe('s', 'skip parts of the template path to name.')
    .array('s')
    .help('h')


yargs.demandOption(['i'])
yargs.argv
const argv = yargs.parsed.argv


function toFunction(code) {
    let output = `function r(){${code}}`
    return transpile(output)
}


let processFile = function(filename, templateName) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, 'utf8', (err, data) => {
            if(err) {
                reject(err, templateName)
                return
            }
            let compiled = compiler.compile(data, vueOptions)
            if (compiled.errors.length) reject(compiled.errors, templateName)
            let jsTemplate
            if (argv.commonjs) {
                jsTemplate = `module.exports.${templateName}={r:${toFunction(compiled.render)}`
                if (compiled.staticRenderFns.length) {
                    jsTemplate += `,s:[${compiled.staticRenderFns.map(toFunction).join(',')}]}`
                } else jsTemplate += '}'
            } else {
                jsTemplate = `${namespace}.${templateName}={r:${toFunction(compiled.render)}`
                if (compiled.staticRenderFns.length) {
                    jsTemplate += `,s:[${compiled.staticRenderFns.map(toFunction).join(',')}]}`
                } else jsTemplate += '}'
            }
            resolve({data: jsTemplate, name: templateName})
        })
    })
}


glob(argv.input, {}, async function(err, files) {
    let fileReads = []
    for (let file of files) {
        let tmpName = file.replace(path.extname(file), '').replace(/\/|-/g, '_').replace('.._', '')
        let templateNameParts = []
        for (part of tmpName.split('_')) {
            if (!argv.skip.includes(part)) {
                templateNameParts.push(part)
            }
        }
        let templateName = templateNameParts.join('_')
        fileReads.push(processFile(file, templateName))
    }
    try {
        results = await Promise.all(fileReads)
        let componentData = ''
        for (let result of results) {
            componentData += result.data
        }

        if (!argv.output) {
            console.log(componentData)
        } else {
            fs.writeFile(argv.output, componentData, (err) => {
                if(err) return console.log(err)
            })
        }
    } catch(err) {
        console.log(err)
    }

})
