import { DATA_SOURCE } from "../constants";
import { createArkivDataSource } from "./arkiv";
import { createMockDataSource } from "./mock";
import type { DataSource } from "./types";

let instance: DataSource | null = null;

/** The only way UI code gets data. Selected by NEXT_PUBLIC_DATA_SOURCE=mock|arkiv. */
export function getDataSource(): DataSource {
  if (!instance) instance = DATA_SOURCE === "arkiv" ? createArkivDataSource() : createMockDataSource();
  return instance;
}

export const isMock = DATA_SOURCE !== "arkiv";
