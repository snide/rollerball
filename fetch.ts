import * as dotenv from 'dotenv';
import * as path from 'path';
import { LinksRecord, XataClient } from './xata'; // Ensure correct import paths

dotenv.config({ path: path.resolve(__dirname, '.env') });

const xata = new XataClient({ apiKey: process.env.XATA_API_KEY, branch: 'main' });

const main = async () => {
  const searchPhrase: string | undefined = process.argv[2] || undefined;

  try {
    let records;
    if (!searchPhrase) {
      records = await xata.db.links.sort('xata.createdAt', 'desc').getAll();
    } else {
      const results = await xata.db.links.search(searchPhrase, {
        fuzziness: 1
      });
      records = results.records;
    }

    const formattedResults = records
      .map((record: LinksRecord) => {
        const trimmedUrl = record.url.substring(0, 90); // URL
        const trimmedTitle = record.title ? record.title.substring(0, 45) : 'Untitled'; // Title, default to "Untitled" if empty
        const trimmedTags = record.tags ? record.tags.substring(0, 50) : ''; // Tags
        return `${record.id}\t${trimmedTitle}\t${trimmedUrl}\t${trimmedTags}`; // ID, Title, URL, Tags
      })
      .join('\n');

    console.log(formattedResults);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};
main();
