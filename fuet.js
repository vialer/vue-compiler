#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const compiler = require('vue-template-compiler')
const glob = require('glob')
const transpile = require('vue-template-es2015-compiler')


class Fuet {

    constructor(options) {
        this.options = options
    }


    toFunction(code) {
        return transpile(`function r(){${code}}`)
    }


    readFile(filename) {
        return new Promise((resolve) => {
            fs.readFile(filename, 'utf8', (err, data) => {
                resolve(data)
            })
        })
    }


    compileTarget(templateData, templateName) {
        let compiled = compiler.compile(templateData, this.options.vue)
        if (compiled.errors.length) throw compiled.errors.join(',')
        let jsTemplate = ''
        if (this.options.commonjs) {
            jsTemplate = `module.exports.${templateName}={r:${this.toFunction(compiled.render)}`
            if (compiled.staticRenderFns.length) {
                jsTemplate += `,s:[${compiled.staticRenderFns.map(this.toFunction).join(',')}]};`
            } else jsTemplate += '};'
        } else {
            jsTemplate = `${this.options.namespace}.${templateName}={r:${this.toFunction(compiled.render)}`
            if (compiled.staticRenderFns.length) {
                jsTemplate += `,s:[${compiled.staticRenderFns.map(this.toFunction).join(',')}]};`
            } else jsTemplate += '};'
        }
        return {data: jsTemplate, name: templateName}
    }


    fileToTemplateName(filename) {
        let tmpName = filename.replace('../', '').replace(path.extname(filename), '').replace(/\/|-/g, '_')
        let templateNameParts = []
        for (let part of tmpName.split('_')) {
            if (!this.options.pathfilter.includes(part)) {
                templateNameParts.push(part)
            }
        }
        let templateName = templateNameParts.join('_')
        return templateName
    }


    writeTemplateData(target, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(target, data, (err) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
    }


    async processFiles(globPattern) {
        glob(globPattern, {}, async(err, filenames) => {
            let fileReads = filenames.map((filename) => this.readFile(filename))
            let data = ''
            const readFiles = await Promise.all(fileReads)
            filenames.forEach((filename, i) => {
                let result = this.compileTarget(readFiles[i], this.fileToTemplateName(filename))
                data += result.data
            })

            if (!this.options.output) console.log(data)
            else this.writeTemplateData(this.options.output, data)
        })
    }


    async processFile(content, filename) {
        return this.compileTarget(content, this.fileToTemplateName(filename))
    }
}


// Only called from the cli.
if (require.main === module) {
    let yargs = require('yargs')
        .usage('Usage: $0 [options]')
        .example('$0 -i "**/*.vue" -o templates.js')
        .epilog('Devhouse Spindle, https://wearespindle.com')
        .option('commonjs', {
            alias: 'c',
            describe: 'use commonjs format',
            type: 'boolean',
            default: false,
        })
        .option('input', {
            alias: 'i',
            describe: 'glob to vue templates',
            type: 'string',
        })
        .option('namespace', {
            alias: 'n',
            describe: 'changes namespace',
            default: 'window.templates',
            type: 'string',
        })
        .option('output', {
            alias: 'o',
            describe: 'output file location',
            type: 'string',
        })
        .option('pathfilter', {
            alias: 'p',
            describe: 'template path to name filter',
            type: 'array',
            default: [],
        })
        .version(() => require('./package').version)
        .help('h')

        yargs.demandOption(['i'])
        yargs.detectLocale(false)
        const argv = yargs.argv

        let options = {
            commonjs: argv.commonjs,
            pathfilter: argv.pathfilter,
            namespace: argv.namespace || 'window.templates',
            vue: {
                preserveWhitespace: false,
            },
        }
        if (argv.output) options.output = argv.output
        const fuet = new Fuet(options)
        fuet.processFiles(argv.input)
}

module.exports = Fuet
