"use strict";
const command_1 = require("@oclif/command");
const util_1 = require("util");
const child_process_1 = require("child_process");
const faker = require("faker");
const fs = require("fs");
const path = require('path');
function dieAndLog(message, error) {
    console.error(message);
    console.error(error);
    process.exit(1);
}
function postgreSQLDate(date) {
    return date.toISOString().replace(/T/, " ").replace(/\..+/, "");
}
class PgAnonymizer extends command_1.Command {
    async originalDump(db, memory) {
        const execPromisified = util_1.promisify(child_process_1.exec);
        try {
            console.log("Launching pg_dump");
            const { stdout, stderr } = await execPromisified(`pg_dump ${db}`, {
                maxBuffer: memory * 1024 * 1024,
            });
            if (stderr.trim()) {
                dieAndLog("pg_dump command failed.", stderr);
            }
            return stdout;
        }
        catch (e) {
            dieAndLog("pg_dump command failed. Are you sure it is installed?", e);
        }
        return "";
    }
    async run() {
        const { args, flags } = this.parse(PgAnonymizer);
        if (flags.fakerLocale) {
            faker.locale = flags.fakerLocale;
        }
        const extension = flags.extension ?
            require(path.join(process.cwd(), flags.extension)) :
            null;
        const result = await this.originalDump(args.database, Number(flags.pgDumpOutputMemory));
        const list = flags.list.split(",").map((l) => {
            return {
                col: l.replace(/:(?:.*)$/, "").toLowerCase(),
                replacement: l.includes(":") ? l.replace(/^(?:.*):/, "") : null,
            };
        });
        let table = null;
        let indices = [];
        let cols = [];
        console.log("Command pg_dump done, starting anonymization.");
        console.log("Output file: " + flags.output);
        fs.writeFileSync(flags.output, "");
        for (let line of result.split("\n")) {
            if (line.match(/^COPY .* FROM stdin;$/)) {
                table = line.replace(/^COPY (.*?) .*$/, "$1");
                console.log("Anonymizing table " + table);
                cols = line
                    .replace(/^COPY (?:.*?) \((.*)\).*$/, "$1")
                    .split(",")
                    .map((e) => e.trim())
                    .map((e) => e.replace(/"/g, ""))
                    .map((e) => e.toLowerCase());
                indices = cols.reduce((acc, value, key) => {
                    if (list.find((l) => l.col === value))
                        acc.push(key);
                    return acc;
                }, []);
                if (indices.length)
                    console.log("Columns to anonymize: " +
                        cols.filter((v, k) => indices.includes(k)).join(", "));
                else
                    console.log("No columns to anonymize");
            }
            else if (table && line.trim()) {
                line = line
                    .split("\t")
                    .map((v, k) => {
                    var _a;
                    if (indices.includes(k)) {
                        const replacement = (_a = list.find(l => l.col === cols[k])) === null || _a === void 0 ? void 0 : _a.replacement;
                        if (replacement) {
                            if (replacement.startsWith("faker.")) {
                                const [_one, two, three] = replacement.split(".");
                                if (!(two && three))
                                    return replacement;
                                if (two === "date")
                                    return postgreSQLDate(faker.date[three]());
                                return faker[two][three]();
                            }
                            if (replacement.startsWith("extension.")) {
                                const functionPath = replacement.split(".");
                                return functionPath.reduce((acc, key) => {
                                    if (acc[key]) {
                                        return acc[key];
                                    }
                                    return acc;
                                }, extension)(v);
                            }
                            return replacement;
                        }
                        if (cols[k] === "email")
                            return faker.internet.email();
                        if (cols[k] === "name")
                            return faker.name.findName();
                        if (cols[k] === "description")
                            return faker.random.words(3);
                        if (cols[k] === "address")
                            return faker.address.streetAddress();
                        if (cols[k] === "city")
                            return faker.address.city();
                        if (cols[k] === "country")
                            return faker.address.country();
                        if (cols[k] === "phone")
                            return faker.phone.phoneNumber();
                        if (cols[k] === "comment")
                            return faker.random.words(3);
                        if (cols[k] === "birthdate")
                            return postgreSQLDate(faker.date.past());
                        return faker.random.word();
                    }
                    return v;
                })
                    .join("\t");
            }
            else {
                table = null;
                indices = [];
                cols = [];
            }
            try {
                fs.appendFileSync(flags.output, line + "\n");
            }
            catch (e) {
                dieAndLog("Failed to write file", e);
            }
        }
    }
}
PgAnonymizer.description = "dump anonymized database";
PgAnonymizer.args = [
    {
        name: "database",
        description: "database connection string, e.g: `postgresql://user:secret@localhost:1234/mybase`",
        required: true,
    },
];
PgAnonymizer.flags = {
    version: command_1.flags.version({ char: "v" }),
    help: command_1.flags.help({ char: "h" }),
    list: command_1.flags.string({
        char: "l",
        description: "list of columns to anonymize",
        default: "email,name,description,address,city,country,phone,comment,birthdate",
    }),
    extension: command_1.flags.string({
        char: "e",
        description: "the path to your extension module",
    }),
    output: command_1.flags.string({
        char: "o",
        description: "output file",
        default: "output.sql",
    }),
    fakerLocale: command_1.flags.string({
        char: "f",
        description: "faker locale (e.g: en, fr, de)",
    }),
    pgDumpOutputMemory: command_1.flags.string({
        char: "m",
        description: "max memory used to get output from pg_dump in MB",
        default: "256",
    }),
};
module.exports = PgAnonymizer;
