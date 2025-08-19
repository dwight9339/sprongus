import { getDb } from "./db.cache";
import {
  ScriptSubsection,
  ScriptBeat
} from "../script";

const db = getDb();

db.exec(`
  /* Stores “Root”, “Section”, and “Paragraph” nodes */
  CREATE TABLE IF NOT EXISTS script_subsections (
    block_id        TEXT PRIMARY KEY,   -- Notion ID of the block
    parent_block_id TEXT NOT NULL,      -- Notion ID of the parent block
    script_block_id TEXT NOT NULL,
    title           TEXT,
    index           INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (
      type IN ('Section', 'Paragraph')
    ),
    last_fetched    TEXT,
    last_edited     TEXT,
  );

  /* Stores individual beats */
  CREATE TABLE IF NOT EXISTS script_beats (
    block_id        TEXT PRIMARY KEY,      
    parent_block_id TEXT NOT NULL,      -- paragraph block ID
    script_block_id TEXT NOT NULL,
    index           INTEGER NOT NULL,
    html            TEXT,
    text      TEXT,
    last_fetched    TEXT,
    last_edited     TEXT,
    hash            TEXT,
  );
`);

db.exec(`CREATE INDEX IF NOT EXISTS scripts_project_idx ON scripts (project_page_id);`);

export function upsertSubsection(s: ScriptSubsection): void {
  getDb().prepare(`
    INSERT INTO script_subsections (
      block_id, parent_block_id, project_page_id, script_block_id,
      index, type, last_fetched, last_edited
    ) VALUES (
      @blockId, @parentBlockId, @projectPageId, @scriptBlockId,
      @index, @type, @lastFetched, @lastEdited
    )
    ON CONFLICT(block_id) DO UPDATE SET
      parent_block_id = excluded.parent_block_id,
      project_page_id = excluded.project_page_id,
      script_block_id = excluded.script_block_id,
      index = excluded.index,
      type = excluded.type,
      last_fetched = excluded.last_fetched,
      last_edited = excluded.last_edited
  `).run(s);
}


export function getSubsectionByBlockId(blockId: string): ScriptSubsection | undefined {
  return getDb().prepare(
    `SELECT * FROM script_subsections WHERE block_id = ?`
  ).get(blockId) as ScriptSubsection | undefined;
}


export function getSubsectionsByParentId(parentBlockId: string): ScriptSubsection[] {
  return getDb().prepare(
    `SELECT * FROM script_subsections WHERE parent_block_id = ? ORDER BY index ASC`
  ).all(parentBlockId) as ScriptSubsection[];
}


export function deleteSubsectionByBlockId(blockId: string): void {
  getDb().prepare(`DELETE FROM script_subsections WHERE block_id = ?`).run(blockId);
}

export function deleteSubsectionsByParentId(parentBlockId: string): void {
  getDb().prepare(`DELETE FROM script_subsections WHERE parent_block_id = ?`).run(parentBlockId);
}


export function upsertBeat(b: ScriptBeat): void {
  getDb().prepare(`
    INSERT INTO script_beats (
      block_id, parent_block_id, project_page_id, script_block_id,
      index, html, plain_text, last_fetched, last_edited, hash
    ) VALUES (
      @blockId, @parentBlockId, @projectPageId, @scriptBlockId,
      @index, @html, @plainText, @lastFetched, @lastEdited, @hash
    )
    ON CONFLICT(block_id) DO UPDATE SET
      parent_block_id = excluded.parent_block_id,
      project_page_id = excluded.project_page_id,
      script_block_id = excluded.script_block_id,
      index = excluded.index,
      html = excluded.html,
      plain_text = excluded.plain_text,
      last_fetched = excluded.last_fetched,
      last_edited = excluded.last_edited,
      hash = excluded.hash
  `).run(b);
}


export function getBeatByBlockId(blockId: string): ScriptBeat | undefined {
  return getDb().prepare(
    `SELECT * FROM script_beats WHERE block_id = ?`
  ).get(blockId) as ScriptBeat | undefined;
}

export function getBeatsByParentId(parentBlockId: string): ScriptBeat[] {
  return getDb().prepare(
    `SELECT * FROM script_beats WHERE parent_block_id = ? ORDER BY index ASC`
  ).all(parentBlockId) as ScriptBeat[];
}

export function deleteBeatByBlockId(blockId: string): void {
  getDb().prepare(`DELETE FROM script_beats WHERE block_id = ?`).run(blockId);
}

export function deleteBeatsByParentId(parentBlockId: string): void {
  getDb().prepare(`DELETE FROM script_beats WHERE parent_block_id = ?`).run(parentBlockId);
}

export function listBeatsByScriptId(scriptBlockId: string): ScriptBeat[] {
  return getDb()
    .prepare(`SELECT * FROM script_beats WHERE script_block_id = ? ORDER BY index ASC`)
    .all(scriptBlockId) as ScriptBeat[];
}
