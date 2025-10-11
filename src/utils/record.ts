/**
 * Helper methods for retrieving table records without hitting the default SDK limit.
 * Bitable `table.getRecordList()` only returns the first ~200 entries. For larger data sets
 * we switch to the paginated `table.getRecords` API (max 5000 per page) and normalise the
 * result so existing code that expects `rec.record.fields` continues to work.
 */

type FetchOptions = {
  viewId?: string;
  pageSize?: number;
};

type NormalizedRecord = {
  record: {
    id: string;
    recordId: string;
    fields: Record<string, any>;
  };
};

const DEFAULT_PAGE_SIZE = 1000;

/**
 * Fetch all records from the provided table, following pagination when necessary.
 * Falls back to `getRecordList` for older SDK versions.
 */
export async function fetchAllRecords(
  table: any,
  options: FetchOptions = {}
): Promise<NormalizedRecord[]> {
  if (!table) return [];

  const pageSize =
    typeof options.pageSize === "number" && options.pageSize > 0
      ? Math.min(options.pageSize, 5000)
      : DEFAULT_PAGE_SIZE;

  if (typeof table.getRecords === "function") {
    const collected: NormalizedRecord[] = [];
    let pageToken: string | undefined;

    do {
      const resp = await table.getRecords({
        pageSize,
        pageToken,
        viewId: options.viewId,
      });

      const current = Array.isArray(resp?.records) ? resp.records : [];
      for (const item of current) {
        const recordId = item?.recordId ?? item?.id ?? "";
        collected.push({
          record: {
            id: recordId,
            recordId,
            fields: item?.fields ?? {},
          },
        });
      }

      if (resp?.hasMore && resp?.pageToken) {
        pageToken = resp.pageToken;
      } else {
        break;
      }
    } while (true);

    return collected;
  }

  if (typeof table.getRecordList === "function") {
    const rawList = await table.getRecordList();
    if (!rawList) return [];
    const list = Array.from(rawList as Iterable<any>);
    return list.map((item) => {
      if (item?.record?.fields) {
        return item as NormalizedRecord;
      }
      const recordId = item?.recordId ?? item?.id ?? "";
      return {
        record: {
          id: recordId,
          recordId,
          fields: item?.fields ?? {},
        },
      };
    });
  }

  return [];
}
