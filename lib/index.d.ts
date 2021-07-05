import { Command, flags } from "@oclif/command";
declare class PgAnonymizer extends Command {
    static description: string;
    static args: {
        name: string;
        description: string;
        required: boolean;
    }[];
    static flags: {
        version: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        list: flags.IOptionFlag<string>;
        extension: flags.IOptionFlag<string | undefined>;
        output: flags.IOptionFlag<string>;
        fakerLocale: flags.IOptionFlag<string | undefined>;
        pgDumpOutputMemory: flags.IOptionFlag<string>;
    };
    originalDump(db: string, memory: number): Promise<string>;
    run(): Promise<void>;
}
export = PgAnonymizer;
