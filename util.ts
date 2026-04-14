/**
 * Generates DOM-safe unique IDs that:
 * - Never start with a number (complies with HTML4 spec)
 * - Are highly collision-resistant
 * - Work in all modern browsers
 *
 * @param {Number} length Desired ID length (default: 21)
 * @returns {String} A DOM-safe unique ID starting with a letter
 */
export function uniqueId(length = 21): string {
    // DOM-safe alphabet (starts with letters, includes numbers and _-)
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // First character must be a letter (a-zA-Z)
    const firstChar = alphabet[Math.floor(Math.random() * 52)];

    // Remaining characters can use full alphabet
    const remaining = Array.from(crypto.getRandomValues(new Uint8Array(length - 1)))
        .map((n) => alphabet[n % alphabet.length])
        .join("");

    return firstChar + remaining;
}

/**
 * Generate a random number between [a,b]
 * @param {Number} a
 * @param {Number} b
 * @returns {Number}
 */
export function randomBetween(a: number, b: number): number {
    b = b > a ? b : a;
    return Math.floor(Math.random() * (b - a + 1) + a);
}

/**
 * Shuffle the order of array elements
 * @param {Array} array
 */
export function shuffle(array: Array<unknown>): unknown[] {
    return array.sort(() => Math.random() - 0.5);
}

/**
 * Initials upper case
 * @param {String} text
 * @returns {String}
 */
export function firstUpperCase(text: string): string {
    return text.toLowerCase().replace(/( |^)[a-z]/g, (L) => L.toUpperCase());
}

/**
 * Strip html tags
 * 1. Identify complete tag matches, e.g. "b" tag will not match "br", "body".
 * 2. Identify empty tags, e.g. "<>" will not be striped.
 * 3. Identify the start and end tag cannot be spaces, e.g. "a < b and c > d" will not be striped.
 * @param {String} html
 * @param {Array} ignoredTags
 * @returns {String}
 */
export function stripHtml(html: string, ignoredTags: Array<string> = []): string {
    ignoredTags.push(" ");
    const tags = ignoredTags.join("|");
    // Remove leading spaces and repeated CR/LF
    return html.replace(new RegExp("<(?!\/?(" + tags + ")\\b)[^<>]+>", "gm"), "").replace(/([\r\n]+ +)+/gm, "");
}

/**
 * Truncate a Chinese-English mixed string of specified length
 * A Chinese character is calculated by two characters
 * @param {String} text
 * @param {Number} length
 * @returns {String}
 */
export function truncate(text: string, length: number): string {
    // Chinese regular expression
    const cnRegex = /[^\\x00-\\xff]/g;

    // Replace one Chinese character with two English letters
    // and then compare the length
    if (text.replace(cnRegex, "**").length > length) {
        const m = Math.floor(length / 2);
        for (let i = m, l = text.length; i < l; i++) {
            const _text = text.substring(0, i);
            if (_text.replace(cnRegex, "**").length >= length) {
                return _text + "...";
            }
        }
    }
    return text;
}

/**
 * Determine whether it is a plain object (the object created by {} or new Object)
 * @link https://github.com/lodash/lodash
 */
export function isPlainObject(value: unknown): boolean {
    if (!value || typeof value !== "object" || Object.prototype.toString.call(value) != "[object Object]") {
        return false;
    }
    if (Object.getPrototypeOf(value) === null) {
        return true;
    }
    let proto = value;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(value) === proto;
}

/**
 * Format template string with placeholder
 * @param {String} pattern
 * @param {Array} args
 * @returns {String}
 */
export function formatString(pattern: string, args: Array<string> | Record<string, string>): string {
    if (Array.isArray(args)) {
        for (let i = 0; i < args.length; i++) {
            pattern = pattern.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
        }
    } else {
        for (const i in args) {
            pattern = pattern.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
        }
    }
    return pattern;
}

/**
 * Format the number of bytes to be easily recognizable by humans
 * @param {Number} bytes
 * @returns {String}
 */
export function formatBytes(bytes: number): string {
    if (!bytes || bytes < 1) return "0";
    const unit = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB"];
    const base = Math.min(unit.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const scale = Math.max(0, base - 2);
    return parseFloat((bytes / Math.pow(1024, base)).toFixed(scale)) + unit[base];
}

/**
 * Format a date according to the specified pattern
 *
 * @param {Date} date Date object or value that can be converted to a date
 * @param {String} pattern Format pattern supporting these placeholders:
 *   - yyyy: 4-digit year
 *   - yy: 2-digit year
 *   - MM: Month (01-12)
 *   - M: Month (1-12)
 *   - dd: Day (01-31)
 *   - d: Day (1-31)
 *   - HH: 24-hour format (00-23)
 *   - H: 24-hour format (0-23)
 *   - hh: 12-hour format (01-12)
 *   - h: 12-hour format (1-12)
 *   - mm: Minutes (00-59)
 *   - m: Minutes (0-59)
 *   - ss: Seconds (00-59)
 *   - s: Seconds (0-59)
 *   - SSS: Milliseconds (000-999)
 *   - S: Milliseconds (0-999)
 *   - a: AM/PM
 * @returns {String} Formatted date string
 */
export function formatDate(date: Date | string | number, pattern: string): string {
    // Handle different date parameter types
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) throw new Error("Invalid date");

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // Months are 0-indexed in JS
    const day = d.getDate();
    const hours24 = d.getHours();
    const hours12 = hours24 % 12 || 12; // Convert 0 to 12 for 12-hour format
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const milliseconds = d.getMilliseconds();
    const ampm = hours24 < 12 ? "AM" : "PM";

    return pattern
        .replace(/yyyy/g, String(year))
        .replace(/yy/g, String(year).slice(-2))
        .replace(/MM/g, String(month).padStart(2, "0"))
        .replace(/M/g, String(month))
        .replace(/dd/g, String(day).padStart(2, "0"))
        .replace(/d/g, String(day))
        .replace(/HH/g, String(hours24).padStart(2, "0"))
        .replace(/H/g, String(hours24))
        .replace(/hh/g, String(hours12).padStart(2, "0"))
        .replace(/h/g, String(hours12))
        .replace(/mm/g, String(minutes).padStart(2, "0"))
        .replace(/m/g, String(minutes))
        .replace(/ss/g, String(seconds).padStart(2, "0"))
        .replace(/s/g, String(seconds))
        .replace(/SSS/g, String(milliseconds).padStart(3, "0"))
        .replace(/S/g, String(milliseconds))
        .replace(/a/g, ampm);
}

/**
 * Format seconds to d h m s
 * @param seconds
 * @returns
 */
export function formatSeconds(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return (
        (d > 0 ? d + "d " : "") +
        (h > 0 ? h + "h " : "") +
        (m > 0 ? m + "m " : "") +
        (s > 0 ? s + "s" : "")
    ).trim();
}

/**
 * Format the duration in milliseconds
 * @param {number} n milliseconds
 * @param {object} options
 *   {leading} add zeros to leading or not
 *   {ms} show milliseconds or not
 * @returns {string}
 */
export function formatDuration(n: number, options?: { leading?: boolean; ms?: boolean }): string {
    const ms = Math.trunc(n) % 1000;
    const seconds = Math.trunc(n / 1000) % 60;
    const minutes = Math.trunc(n / 60000) % 60;
    const hours = Math.trunc(n / 3600000);
    options = options || { leading: false, ms: false };

    let result = "";
    if (hours > 0) {
        result = (options.leading ? hours.toString().padStart(2, "0") : hours) + ":";
        options.leading = true;
    }
    result +=
        (options.leading ? minutes.toString().padStart(2, "0") : minutes) + ":" + seconds.toString().padStart(2, "0");
    if (options.ms) {
        result += "." + ms.toString().padStart(3, "0");
    }
    return result;
}

/**
 * Parse format string into milliseconds
 * @param {string} s
 * @returns {number}
 */
export function parseDuration(s: string): number {
    if (!s) return 0;
    const m = s.trim().match(/^(\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?$/);
    if (!m) return 0;

    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    const seconds = parseInt(m[3], 10);
    const ms = parseFloat(m[4]) || 0;

    if (hours > 59 || minutes > 59 || seconds > 59) return 0;
    return (hours * 60 + minutes) * 60 + seconds + ms;
}

/**
 * Compare two strings
 * @param aStr
 * @param bStr
 * @param locale
 * @returns
 */
export function localeCompare(aStr: string, bStr: string, locale = "zh"): number {
    const regExp = [/[\s\~\!\@\#\$\%\^\&\*\(\)\-\_\+\=\{\}\[\]\|\<\>\,\.\?\/\\]/, /[0-9]/, /[a-zA-Z]/, /./];

    const length = Math.min(aStr.length, bStr.length);
    for (let i = 0; i < length; i++) {
        const aChar = aStr.charAt(i);
        const bChar = bStr.charAt(i);
        if (aChar === bChar) continue;

        const aIndex = regExp.findIndex((v) => v.test(aChar));
        const bIndex = regExp.findIndex((v) => v.test(bChar));

        if (aIndex != bIndex) {
            return aIndex - bIndex;
        }
        if (aIndex === 1) {
            return parseInt(aChar) - parseInt(bChar);
        }
        if (aIndex === 2) {
            return aChar.toLowerCase() < bChar.toLowerCase() ? -1 : 1;
        }
        if (aIndex === 3) {
            return aChar.localeCompare(bChar, locale);
        }
        return aChar < bChar ? -1 : 1;
    }
    return aStr.length - bStr.length;
}

/**
 * Deep merge multiple objects
 * @param {Array} ...object
 * @return {Object}
 */
export function mergeObjects(...objs: Array<any>): unknown {
    const result: any = {};
    objs.forEach((obj) => {
        for (const key in obj) {
            const value = obj[key];
            if (isPlainObject(result[key]) && isPlainObject(value)) {
                result[key] = mergeObjects(result[key], value);
            } else {
                result[key] = value;
            }
        }
    });
    return result;
}

/**
 * Merge two arrays by the specify function.
 * @example mergeArrays(arr1, arr2, (v1, v2) => v1.id == v2.id)
 * @param arr1
 * @param arr2
 * @param callback
 * @returns
 */
// deno-lint-ignore ban-types
export function mergeArrays(arr1: any[], arr2: any[], callback: Function): unknown[] {
    const merged: Array<any> = [];
    const clone = [...arr2];
    arr1.forEach((a1) => {
        const index = clone.findIndex((a2) => callback(a1, a2));
        if (index > -1) {
            const found = clone.splice(index, 1)[0];
            merged.push(Object.assign(a1, found));
        }
    });
    return merged;
}

/**
 * Swap array elements by index
 * @param arr
 * @param index1
 * @param index2
 * @returns
 */
export function swapArray(arr: unknown[], index1: number, index2: number): unknown[] {
    arr[index1] = arr.splice(index2, 1, arr[index1])[0];
    return arr;
}
