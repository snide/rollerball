import { EditableData, SelectableColumn, SelectedPick } from '@xata.io/client';
import cheerio from 'cheerio';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { tmpdir } from 'os';
import * as path from 'path';
import { join } from 'path';
import { LinksRecord, XataClient } from './xata';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const xata = new XataClient({ apiKey: process.env.XATA_API_KEY, branch: 'main' });

async function fetchRecordById(id: string): Promise<LinksRecord | null> {
  const record = await xata.db.links.read(id);
  return record;
}

const createTempFileWithContent = (content: string): string => {
  const filePath = join(tmpdir(), `linkbot-edit-${Math.random().toString(36).substring(7)}`);
  writeFileSync(filePath, content);
  return filePath;
};

const openEditor = (filePath: string): void => {
  const editor = process.env.EDITOR || 'vi';
  execSync(`${editor} ${filePath}`, { stdio: 'inherit' });
};

const parseFile = (filePath: string): Record<string, string | boolean> => {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  type ResultKey = 'url' | 'title' | 'tags' | 'isPrivate' | 'comment';
  let currentSection: ResultKey = 'url'; // Default value, will be immediately overwritten

  const result: Record<ResultKey, string | boolean> = {
    url: '',
    title: '',
    tags: '',
    isPrivate: true,
    comment: ''
  };

  lines.forEach((line) => {
    if (line.startsWith('# Add URL')) {
      currentSection = 'url';
    } else if (line.startsWith('# Add TITLE')) {
      currentSection = 'title';
    } else if (line.startsWith('# Add comma-separated TAGS')) {
      currentSection = 'tags';
    } else if (line.startsWith('# Is this a private link?')) {
      currentSection = 'isPrivate';
    } else if (line.startsWith('# Add COMMENTS')) {
      currentSection = 'comment';
    } else if (!line.startsWith('#')) {
      if (currentSection === 'comment') {
        // Append to the comment if it's multi-line and already has content
        result[currentSection] += (result[currentSection] ? '\n' : '') + line;
      } else if (currentSection === 'isPrivate') {
        // Convert 'true' or 'y' to true, anything else to false
        result[currentSection] = line.trim().toLowerCase() === 'true' || line.trim().toLowerCase() === 'y';
      } else {
        // Overwrite for single-line sections (url, title, tags)
        result[currentSection] = line;
      }
    }
  });

  // Trim any trailing newline from the comment
  if (typeof result.comment === 'string') {
    result.comment = result.comment.replace(/\n+$/, '');
  }

  return result;
};

const fetchMetadata = async (url: string): Promise<{ title: string; description: string }> => {
  try {
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);
    const title = $('head title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    return { title, description };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return { title: '', description: '' };
  }
};

const deleteFile = (filePath: string): void => {
  unlinkSync(filePath);
};

const edit = async () => {
  const id = process.argv[2];

  const fields: SelectableColumn<LinksRecord>[] = ['id', 'url', 'title', 'tags', 'comment', 'isPrivate'];
  type EmptyLinksRecord = EditableData<SelectedPick<LinksRecord, typeof fields>>;

  let record: LinksRecord | EmptyLinksRecord = { id: '', url: '', title: '', tags: '', comment: '', isPrivate: true };

  if (id) {
    record = (await fetchRecordById(id)) || record;
  }

  const filledTemplate = `# Lines beginning with "#" will be stripped.
# Add URL in next line (single line).
${record.url}
# Add TITLE in next line (single line). Leave blank to web fetch, "-" for no title.
${record.title}
# Add comma-separated TAGS in next line (single line).
${record.tags}
# Is this a private link? (true or y for yes, anything else for no)
${record.isPrivate ? 'true' : 'false'}
# Add COMMENTS in next line(s). Leave blank to web fetch, "-" for no comments.
${record.comment}
`;

  const filePath = createTempFileWithContent(filledTemplate); // Function to create temp file with filledTemplate
  openEditor(filePath);

  const updatedRecord = parseFile(filePath);

  // Convert isPrivate from string to boolean
  if (typeof updatedRecord.isPrivate === 'string') {
    updatedRecord.isPrivate = updatedRecord.isPrivate === 'true';
  }

  // Fetch metadata if title or comments are empty and not explicitly set to "-"
  if ((updatedRecord.title === '' || updatedRecord.comment === '') && updatedRecord.url) {
    const metadata = await fetchMetadata(updatedRecord.url as string);
    updatedRecord.title = updatedRecord.title === '-' ? '' : updatedRecord.title || metadata.title;
    updatedRecord.comment = updatedRecord.comment === '-' ? '' : updatedRecord.comment || metadata.description;
  }

  if (id) {
    updatedRecord.id = id;
  } else {
    const recentRecords = await xata.db.links.sort('xata.createdAt', 'desc').getMany();
    if (recentRecords.length > 0) {
      const lastRecord = recentRecords[0];
      const lastId = parseInt(lastRecord.id);
      updatedRecord.id = (lastId + 1).toString();
    } else {
      updatedRecord.id = '1';
    }
  }

  try {
    if (updatedRecord.url === '') {
      throw new Error('URL is required');
    } else {
      await xata.db.links.createOrUpdate(updatedRecord);
      console.log(updatedRecord);
    }
  } catch (error) {
    console.error('Error updating record:', error);
  }

  deleteFile(filePath);
};

edit();
