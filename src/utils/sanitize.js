const sanitizeHtml = require('sanitize-html');

// Rich-text (HTML) coming from the admin editors is cleaned before it is stored.
const OPTS = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'span', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['style'] },
  allowedStyles: { '*': { 'text-align': [/^(left|right|center|justify)$/] } },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: { a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noopener noreferrer nofollow', ...(attribs.href && /^https?:/i.test(attribs.href) ? { target: '_blank' } : {}) } }) },
};

const clean = (html) => (typeof html === 'string' ? sanitizeHtml(html, OPTS) : html);
// { en, bn } -> sanitized copy
const cleanBi = (o) => (o && typeof o === 'object' ? { ...o, en: clean(o.en), bn: clean(o.bn) } : o);

module.exports = { clean, cleanBi };
