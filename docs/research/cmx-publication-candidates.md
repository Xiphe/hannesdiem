# CMX ownership candidates from publication

These candidates come from the production publication module. They are open for
grilling in `cmx-tools/packages`; the application retains the working behavior
until a CMX decision and a suitable replacement exist.

| Candidate                                                   | Production evidence                                                                                                                                                | CMX discussion                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Complete-publication verification and rejection diagnostics | The storage adapter assembles the candidate collection, validates relationships across entries, and recovers a rejection outside the host's boolean commit result. | [#203](https://github.com/cmx-tools/packages/issues/203) |
| Revision-coherent reads                                     | Persistent reads materialize page content, site metadata, and revision together. Prepared sources capture the same snapshot behavior.                              | [#204](https://github.com/cmx-tools/packages/issues/204) |
| Publication completion outcomes                             | The host integration identifies accepted or unchanged publications, finishes revision-specific cache refresh, and retries pending work after failure.              | [#205](https://github.com/cmx-tools/packages/issues/205) |
| Supported signed-publishing integration                     | Client and host share expiring request proofs, replay protection, cross-runtime key handling, and an edge-safe conditional header.                                 | [#206](https://github.com/cmx-tools/packages/issues/206) |

The [Publication module](../../app/publication/README.md) isolates these behaviors.
Its public entries keep the portable document/source contract separate from the
Cloudflare adapter. Module tests exercise the production route, real SQLite
persistence, and the varying cache-refresh adapter.

Application-owned decisions include public routes, the site metadata shape,
navigation, image processing, presentation, and Cloudflare cache tags. The issues
ask which generic mechanics CMX should own without moving those decisions into
the Document model.

Existing compatibility discussions [#184](https://github.com/cmx-tools/packages/issues/184)
and [#186](https://github.com/cmx-tools/packages/issues/186) remain related work.
The snapshot candidate addresses consistency of one accepted publication, rather
than negotiation or selection of an older compatible Document.

Publication preparation, wider site/newsletter restructuring, and the broader
documentation cleanup remain deferred for reevaluation.
