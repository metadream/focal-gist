/**
 * 生成带省略号的页码数组
 * @example [1, ..., 8, 9, 10, 11, 12, ..., 20]
 * @param totalPages 总页数
 * @param pageNumber 当前页码
 * @param around 当前页环绕左右最大页码数（默认值 2）
 * @returns
 */
function calcEllipsisPages(totalPages: number, pageNumber: number, around = 2): any {
    const baseCount = around * 2 + 5; // 总元素个数：环绕左右页码*2+当前页+省略号*2+首页+末页
    const surplus = baseCount - 2; // 只出现一个省略号时剩余元素个数
    const startIndex = 1 + 2 + around + 1; // 前面出现省略号的临界点
    const endIndex = totalPages - 2 - around - 1; // 后面出现省略号的临界点

    // 全部显示，不出现省略号
    if (totalPages <= baseCount) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // 只有后面出现省略号
    if (pageNumber < startIndex) {
        return [...Array.from({ length: surplus }, (_, i) => i + 1), "...", totalPages];
    }
    // 只有前边出现省略号
    if (pageNumber > endIndex) {
        return [1, "...", ...Array.from({ length: surplus }, (_, i) => totalPages - surplus + i + 1)];
    }
    // 两边都有省略号
    return [1, "...", ...Array.from({ length: around * 2 + 1 }, (_, i) => pageNumber - around + i), "...", totalPages];
}

/**
 * 分页助手
 * @param totalSize 总记录数
 * @param pageSize 每页记录数
 * @param pageNumber 当前页码
 * @returns
 */
export default function paginate(totalSize: number, pageSize: number, pageNumber = 1) {
    const totalPages = Math.ceil(totalSize / pageSize);
    if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(`Page number is out of range (1-${totalPages})`);
    }
    const ellipsisPages = calcEllipsisPages(totalPages, pageNumber);
    const start = pageSize * (pageNumber - 1); // 当前页的记录起始位置
    const end = Math.min(pageSize * pageNumber, totalSize); // 当前页的记录结束位置
    const limit = end - start;
    return { totalSize, totalPages, ellipsisPages, pageNumber, start, end, limit };
}
