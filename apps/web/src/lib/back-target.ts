import { parseIds } from "./facebook-post";

type Param = string | string[] | undefined;

/** Opens a record from the post being put together, remembering which records the post holds. */
export function recordHref(recordId: string, postIds: readonly string[]): string {
  return `/admin/records/${recordId}?from=publish&ids=${postIds.join(",")}`;
}

function first(value: Param): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Where the arrow of a record's page goes: back to the post the owner was putting together when that is
 * where they came from, otherwise to the list. Only record ids are read from the address, never a path.
 */
export function backTarget(params: { from?: Param; ids?: Param }): string {
  const ids = parseIds(params.ids);
  return first(params.from) === "publish" && ids.length > 0 ? `/admin/publish?ids=${ids.join(",")}` : "/admin";
}
