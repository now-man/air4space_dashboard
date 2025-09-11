const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const CSV_URL = 'https://drive.google.com/uc?export=download&id=19191SkOve-WWZsWK8SvWPPgdMrJsIoT9';

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }
    const data = await response.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/csv' },
      body: data,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch CSV data.' }),
    };
  }
};
