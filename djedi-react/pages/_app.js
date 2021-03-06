/* global process */

import { NodeContext, djedi } from "djedi-react";
import unfetch from "isomorphic-unfetch";
import App, { Container } from "next/app";
import PropTypes from "prop-types";
import React from "react";

import Link from "../components/Link";

const LANGUAGES = {
  "en-us": "English",
  "de-de": "German",
  "sv-se": "Swedish",
};

const DEFAULT_LANGUAGE = "en-us";

// Set default and available languages.
djedi.options.languages = {
  default: DEFAULT_LANGUAGE,
  additional: Object.keys(LANGUAGES).filter(
    language => language !== DEFAULT_LANGUAGE
  ),
};

// Set baseUrl differently for server and browser rendering.
djedi.options.baseUrl =
  (typeof process !== "undefined" && process.env.SERVER_BASE_URL) ||
  "http://localhost:8000/djedi/api";

// Required: Set the `fetch` function to use.
djedi.options.fetch = unfetch;

// Inject the admin sidebar, if the user has permission.
djedi.injectAdmin();

export default class MyApp extends App {
  static async getInitialProps({ Component, ctx, ctx: { query } }) {
    // This demo uses a query parameter for the language to keep the demo small.
    // Ugly, but it works.
    const language = {}.hasOwnProperty.call(LANGUAGES, query.language)
      ? query.language
      : DEFAULT_LANGUAGE;

    // Load page data and Djedi nodes in parallel.
    const [pageProps] = await Promise.all([
      // Pass the language to the child `getInitialProps`, in case it needs to
      // call `djedi.prefetch`.
      Component.getInitialProps
        ? Component.getInitialProps({ ...ctx, language })
        : {},
      // Prefetch on all pages. If the page takes care of prefetching itself (like
      // index.js does), the page should set `.skipDjediPrefetch = true` on
      // itself to avoid double network requests.
      Component.skipDjediPrefetch ? undefined : djedi.prefetch({ language }),
    ]);

    // Track which nodes are actually rendered.
    const nodes = djedi.track();

    return { pageProps, nodes, language };
  }

  // Add in nodes loaded by `djedi.track` server-side.
  constructor(props) {
    super(props);

    if (props.nodes != null) {
      djedi.addNodes(props.nodes);
    }
  }

  render() {
    const { Component, pageProps, language } = this.props;

    return (
      <React.StrictMode>
        <Container>
          {/* Provide the current language to all `<Node>`s. */}
          <NodeContext.Provider value={language}>
            <LanguageChooser current={language} />
            <Component {...pageProps} />
          </NodeContext.Provider>
        </Container>
      </React.StrictMode>
    );
  }
}

LanguageChooser.propTypes = {
  current: PropTypes.oneOf(Object.keys(LANGUAGES)).isRequired,
};

function LanguageChooser({ current }) {
  return (
    <div>
      {Object.entries(LANGUAGES).map(([language, name], index) => (
        <React.Fragment key={language}>
          {index !== 0 && " / "}

          {language === current ? (
            <strong>{name}</strong>
          ) : (
            <Link href={{ query: { language } }}>
              <a>{name}</a>
            </Link>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
