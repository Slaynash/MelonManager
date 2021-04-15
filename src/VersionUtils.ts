export class VersionUtils {
    public static compareVersion(left: VersionData | String, right: VersionData | String): number {
        if (typeof left === 'string' || left instanceof String)
            left = this.getVersion(left.toString())
        if (typeof left === 'string' || right instanceof String)
            right = this.getVersion(right.toString())

        if (left.isValidSemversion != right.isValidSemversion)
            return left.isValidSemversion ? 1 : -1;

        let compareLength = left.getLength() > right.getLength() ? left.getLength() : right.getLength();
        for (let i = 0; i < compareLength; ++i) {
            let leftNumber = left.getIndex(i);
            let rightNumber = right.getIndex(i);

            return (leftNumber > rightNumber) ? 1 : ((leftNumber < rightNumber) ? -1 : 0);
        }
    }

    public static getVersion(versionString: string): VersionData {
        versionString = versionString.trim();

        if (versionString == "")
            return VersionData.ZERO;

        let matches = versionString.match(/\\d+/);
        let isValidSemver = /^v?[0-9][\\d.-_]*[^\\s]*$/.test(versionString);
        console.log(`SEMVER "${versionString}": ${isValidSemver}`);

        return new VersionData(matches, isValidSemver);
    }
}

export class VersionData {
    public static readonly ZERO = new VersionData();

    public numbers: number[];

    public isValidSemversion: boolean;

    public constructor(collection: RegExpMatchArray = null, validSemver: boolean = false) {
        this.isValidSemversion = validSemver;
        this.numbers = [];

        if (collection != null) {
            for (let match of collection) {
                this.numbers.push(Number(match) > 0 ? Number(match) : 0);
            }
        }
    }

    public getIndex(index: number) {
        return this.numbers.length > index ? this.numbers[index] : 0;
    }

    public getLength() {
        return this.numbers.length;
    }
}