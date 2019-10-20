## UE4-locres-Online-Editor v1.2

This is a handy editor for binary .locres files from Unreal Engine 4.

It converts a locres file to textual representation, and then it is able to recreate the similar locres file from your modified text.

This tool is primary targeted for translating games. For this reason, it allows to specify several strings per one game text – this way, you can have a translated version right below the original source string.

### Try it online

This program is written in Javascript, and works in browser. All data processing is done on the client; you can also save HTML page and use locally:

**[UE4locresOnlineEditor1V2.htm](https://klimaleksus.github.io/UE4-locres-Online-Editor/UE4locresOnlineEditor1V2.htm)**

The main documentation is written in Russian, but all UI buttons have English texts and help popups/hints.

### Sample text output

Note: do not change stuff in parentheses (hex binary data), and better is to not change `<NAME>` and `<TEXT>` quoted identifications.

But you freely can:
- Rename file in `<FILE>` section.
- Put another quoted line below any original line under `<TEXT>` section, as a "translation".
- Insert different text lines between two sequential `<TEXT>` blocks (that otherwise refer to the same string).
- Rearrange `<NAME>` (relative to other `<NAME>` in one `<FILE>`) and `<TEXT>` (relative to other `<TEXT>` in one `<NAME>`) blocks in any order you wish.
- Duplicate any data entry: everything with the same path (`<FILE>` + `<NAME>` + `<TEXT>` key) will be merged; exact copies are dropped, but any different text lines will be treated as translations.

Here is a dummy sample:

```
<FILE> "dummy_sample.locres" (112233445566778899aabbccddeeff0001)


<NAME> "block namespace, can be empty":

<TEXT> "key_for_string" (deadbeef)
"Original text line"
"Your translation"

<TEXT> "key_two" (01234567)
<TEXT> "key_three" (01234567)
"Not translated, both refer to the same line"

<NAME> "another_namespace":

<TEXT> "key" (89abcdef)
"Some escaped characters: <cr> <lf> <cf> <tab> <q> <lt> <gt> <$01>"
```

Which is converted to this binary file: [dummy_sample.locres](./dummy_sample.locres). It will not work in Unreal Engine as is, because you should edit a real file from a game, since the system can address texts only by key names, which are unique for each game.

### //EOF
