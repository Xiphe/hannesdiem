# Temple button inventory

Audit for the light palette selected on2026-11-03. “Use secondary where possible” applies to action buttons and links presented as buttons. Use `#6b6966` with white text, a darker hover and a visible focus outline. Keep existing disabled/loading behavior and all supplied labels.

| Button or button-like action                                        | Implementation                                      | Treatment                                                                                                 |
| ------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Temple entry and manifesto return                                   | `.temple-enter-button`                              | Accepted theme-specific artwork; see [entry buttons](../entry-button/README.md)                           |
| Visit contact action                                                | `.location-button`                                  | Secondary fill, white text                                                                                |
| Watch Get notified trigger and submit                               | `.fact-action` / `.temple-signup`                   | Secondary fill, white text; spinner and disabled states retained                                          |
| Create/Share/future section actions, including contact links        | `.fact-action :is(button, a)`                       | Secondary fill, white text; unavailable actions stay disabled                                             |
| Take your place / Welcome / waiting-list invitation                 | `.fact-circle-invite` and its SVG surface           | Secondary surface, white label; preserve the pointing shape                                               |
| Request login email; claim or join waiting list                     | `.circle-fields` submit buttons                     | Secondary fill, white text                                                                                |
| Rename                                                              | `.circle-rename` submit                             | Secondary fill, white text; squared inner input/button corners                                            |
| Change seat No / Yes                                                | `.circle-move-actions` buttons                      | No: secondary; Yes: primary. Keep loading and disabled states.                                            |
| Circle Retry                                                        | `.fact-circle-area > button`                        | Secondary fill, white text                                                                                |
| Menu newsletter Signup / Get Login Link / Logout / Retry newsletter | `.newsletter-controls` / `.newsletter-area`         | Secondary fill, white text, scoped to Temple                                                              |
| Release my spot                                                     | `.circle-release`                                   | Red ghost action, explicitly retained by the artist; centred with horizontal padding and less space below |
| Close signup/Circle, close contact, open/close menu                 | Icon buttons                                        | Keep unfilled icon treatment and focus affordance                                                         |
| Explanatory tooltip triggers                                        | `.piece-tooltip-trigger`                            | Keep inline dotted text treatment                                                                         |
| Notification switch                                                 | Native checkbox with `role=switch`                  | Keep switch styling and state sentence; solid blue on, selected neutral colors off                        |
| Circle place selection                                              | Native choice inputs / dot surfaces                 | Keep selection geometry and active/owned highlights                                                       |
| Native video controls                                               | Browser-owned media controls                        | Keep native controls                                                                                      |
| Optional fragmented artwork action                                  | `FragmentAction`, currently not mounted in the page | Preserve its existing artwork treatment; no new action is introduced                                      |

Ordinary text, navigation and contact-option links remain links. The blue-to-teal primary gradient appears only in the header progress bar. These are light-mode changes; existing dark-mode action colors remain intact.
