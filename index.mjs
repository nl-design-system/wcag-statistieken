// @license EUPL-1.2
import { parse as parseCSV } from 'csv-parse/dist/esm/sync.js';
import { successCriteriaNumberMap } from './wcag21.mjs';

const locale = 'nl-NL';

const analyzeCsv = (csv) => {
  let lines = parseCSV(csv, { delimiter: ';' });

  const headerColumns = lines[0];
  const unknownScIndex = headerColumns.indexOf('0.0.0');

  /* Success criteria for WCAG conformance level AA */
  const aa = [
    '1.1.1',
    '1.2.1',
    '1.2.2',
    '1.2.3',
    '1.2.4',
    '1.2.5',
    '1.3.1',
    '1.3.2',
    '1.3.3',
    '1.3.4',
    '1.3.5',
    '1.4.1',
    '1.4.2',
    '1.4.3',
    '1.4.4',
    '1.4.5',
    '1.4.10',
    '1.4.11',
    '1.4.12',
    '1.4.13',
    '2.1.1',
    '2.1.2',
    '2.1.4',
    '2.2.1',
    '2.2.2',
    '2.3.1',
    '2.4.1',
    '2.4.2',
    '2.4.3',
    '2.4.4',
    '2.4.5',
    '2.4.6',
    '2.4.7',
    '2.5.1',
    '2.5.2',
    '2.5.3',
    '2.5.4',
    '3.1.1',
    '3.1.2',
    '3.2.1',
    '3.2.2',
    '3.2.3',
    '3.2.4',
    '3.3.1',
    '3.3.2',
    '3.3.3',
    '3.3.4',
    '4.1.1',
    '4.1.2',
    '4.1.3',
  ];

  // Map the success criterium number to the column index.
  const scIndexes = aa.map((sc) => headerColumns.indexOf(sc)).filter((index) => index !== -1);

  const scWithoutColumn = aa.filter((sc) => !headerColumns.includes(sc));
  if (scWithoutColumn.length > 0) {
    console.warn(`The following success criteria are not in the CSV file: ${scWithoutColumn.join(' ')}`);
  }

  // Exclude the header row
  let records = lines.slice(1);

  records = records.filter((record) => record[6] === 'onderbouwing toereikend');

  // Start with an empty array for every success criterium
  const totalsMap = new Map(aa.map((sc) => [sc, []]));

  // Loop over each data record in the CSV file,
  // and reduce it to a count for each success criterium
  records.reduce((totalsMap, record) => {
    //
    scIndexes.reduce((totalsMap, columnIndex) => {
      const key = headerColumns[columnIndex];
      const value = record[columnIndex];

      if (value === '0') {
        totalsMap.get(key).push(record);
      }

      return totalsMap;
    }, totalsMap);

    return totalsMap;
  }, totalsMap);

  return {
    records,
    totalsMap,
  };
};

const percentageFormatter = new Intl.NumberFormat(locale, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: 'percent',
});

const formatPercentage = (n) => percentageFormatter.format(n);

const numberFormatter = new Intl.NumberFormat(locale, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const formatMb = (n) => `${numberFormatter.format(n / 1e6)} megabyte`;

const init = async () => {
  const csvUrl = document.querySelector('a[href$=".csv"][download]').href;
  const request = await fetch(csvUrl);
  const response = await request.text();
  const { records, totalsMap } = analyzeCsv(response);
  const noscript = document.querySelector('noscript#generated');

  // Create a table with a row for each success criterium
  const tableBody = Array.from(totalsMap.entries())
    .sort(([, scRecordsA], [, scRecordsB]) => scRecordsA.length - scRecordsB.length)
    .reverse()
    .reduce((fragment, [sc, scRecords]) => {
      // Create a section with an ID, so you can create fragment identifier links to
      // this succcess criterium.
      const row = document.createElement('tr');
      const headingCell = document.createElement('th');
      headingCell.id = crypto.randomUUID();
      const span = document.createElement('span');
      span.classList.add('nlds-toc-label');
      span.textContent = sc;
      headingCell.appendChild(span);
      row.appendChild(headingCell);

      const headingCell2 = document.createElement('th');
      headingCell2.id = crypto.randomUUID();
      headingCell2.appendChild(document.createTextNode(successCriteriaNumberMap.get(sc).nl.title));
      row.appendChild(headingCell2);

      const dataCell = document.createElement('td');
      dataCell.classList.add('utrecht-number-data');
      dataCell.classList.add('nlds-numeric-table-cell');
      dataCell.textContent = formatPercentage(scRecords.length / records.length);

      // Create a link to relevant WCAG page on the NL Design System website
      const actionCell = document.createElement('td');
      const link = document.createElement('a');
      link.id = crypto.randomUUID();
      link.href = `#${sc}`;
      link.textContent = `Details`;
      link.setAttribute('aria-labelledby', [link.id, headingCell2.id].join(' '));
      actionCell.appendChild(link);

      row.appendChild(dataCell);
      row.appendChild(actionCell);

      fragment.appendChild(row);
      return fragment;
    }, document.createElement('tbody'));

  const table = document.createElement('table');
  const tableHeader = document.createElement('thead');
  const tableHeaderCell1 = document.createElement('th');
  tableHeaderCell1.textContent = 'Successcriterium';
  tableHeaderCell1.colSpan = 2;
  const tableHeaderCell2 = document.createElement('th');
  tableHeaderCell2.textContent = 'Websites met problemen';
  tableHeaderCell2.classList.add('nlds-numeric-table-header-cell');
  const tableHeaderCell3 = document.createElement('th');
  tableHeaderCell3.textContent = 'Link';
  tableHeader.appendChild(tableHeaderCell1);
  tableHeader.appendChild(tableHeaderCell2);
  tableHeader.appendChild(tableHeaderCell3);
  table.appendChild(tableHeader);
  table.appendChild(tableBody);
  noscript.parentNode.insertBefore(table, noscript);

  // Create a section for each success criterium
  const fragment = Array.from(totalsMap.entries()).reduce((fragment, [sc, scRecords]) => {
    // Create a section with an ID, so you can create fragment identifier links to
    // this succcess criterium.
    const section = document.createElement('section');
    section.id = sc;
    const heading = document.createElement('h3');
    const span = document.createElement('span');
    span.classList.add('nlds-toc-label');
    span.textContent = sc;
    heading.appendChild(span);
    heading.appendChild(document.createTextNode(` ${successCriteriaNumberMap.get(sc).nl.title}`));

    section.appendChild(heading);
    const p2 = document.createElement('p');
    p2.textContent = `${scRecords.length} van de ${
      records.length
    } gemeten audits heeft een probleem gevonden voor WCAG ${sc}. Dat is ${formatPercentage(
      scRecords.length / records.length,
    )}.`;
    section.appendChild(p2);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `Bekijk de ${scRecords.length} rapporten`;
    details.appendChild(summary);
    const list = document.createElement('ol');
    scRecords.reduce((list, record) => {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = `https://www.toegankelijkheidsverklaring.nl/register/${record[0]}`;
      link.appendChild(document.createTextNode(`Verklaring van ${record[1]}`));
      listItem.appendChild(link);
      listItem.appendChild(document.createTextNode(' voor '));
      const siteLink = document.createElement('a');
      siteLink.classList.add('utrecht-url-data');
      siteLink.href = record[11];
      siteLink.appendChild(document.createTextNode(record[11]));
      listItem.appendChild(siteLink);
      list.appendChild(listItem);
      return list;
    }, list);
    details.appendChild(list);
    section.appendChild(details);

    // Create a link to relevant WCAG page on the NL Design System website
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = `https://nldesignsystem.nl/wcag/${sc}`;
    link.textContent = `Lees meer over WCAG ${sc} bij NL Design System.`;
    p.appendChild(link);
    section.appendChild(p);

    fragment.appendChild(section);
    return fragment;
  }, document.createDocumentFragment());

  noscript.parentNode.insertBefore(fragment, noscript);
};

const annotateDownloadLinks = async () => {
  Array.from(document.querySelectorAll('a[download]:any-link:not([data-size]')).forEach(async (link) => {
    const response = await fetch(link.href, { method: 'HEAD' });
    const size = response.headers.get('Content-Length');
    link.setAttribute('data-size', formatMb(size));
  });
};

init();
annotateDownloadLinks();
