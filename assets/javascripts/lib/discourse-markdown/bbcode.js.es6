import { registerOption } from "pretty-text/pretty-text";

registerOption(
  (siteSettings, opts) => (opts.features["vbulletin-bbcode"] = true)
);

function wrap(tag, attrs, callback, startContent, endContent) {
  return function (startToken, endToken, tagInfo, content) {
    startToken.tag = endToken.tag = tag;
    startToken.content = endToken.content = "";

    startToken.type = "bbcode_open";
    endToken.type = "bbcode_close";

    startToken.nesting = 1;
    endToken.nesting = -1;

    if (Array.isArray(attrs)) {
      startToken.attrs = []
      attrs.forEach(attr =>
        startToken.attrs.push([attr[0], attr[1] instanceof Function ? attr[1](tagInfo) : attr[1]])
      );
    } else {
      startToken.attrs = [
        [attrs, callback ? callback(tagInfo) : tagInfo.attrs._default]
      ];
    }
    if (startContent) {
      startToken.children(startContent)
    }
  };
}

function setupMarkdownIt(md) {
  const ruler = md.inline.bbcode.ruler;

  ruler.push("size", {
    tag: "size",
    wrap: wrap(
      "font",
      "style",
      tagInfo => {
        const maxSize = 250;
        let size = tagInfo.attrs._default.trim();
        return "font-size:" + (size > maxSize ? maxSize : size) + "%";
      })
  });

  ruler.push("color", {
    tag: "color",
    wrap: wrap("font", [
      ["class", "colored"],
      ["color", tagInfo => tagInfo.attrs._default]
    ])
  });

  ruler.push("mod", {
    tag: "mod",
    wrap: "span.mod"
  });

  ruler.push("highlight", {
    tag: "highlight",
    wrap: "span.highlight"
  });

  ruler.push("small", {
    tag: "small",
    wrap: wrap("span", "style", () => "font-size:x-small")
  });

  ruler.push("title", {
    tag: "title",
    wrap: "span.djtitle"
  });

  ruler.push("ld", {
    tag: "ld",
    wrap: "span.ld"
  });

  ruler.push("nd", {
    tag: "nd",
    wrap: "span.nd"
  });

  ruler.push("fld", {
    tag: "fld",
    wrap: "span.fld"
  });

  ruler.push("hi", {
    tag: "hi",
    wrap: "span.hi"
  });

  ruler.push("fa", {
    tag: "fa",
    wrap: "span.faw"
  });

  ruler.push("com", {
    tag: "com",
    wrap: "span.com"
  });

  ruler.push("aname", {
    tag: "aname",
    wrap: wrap("a", "name")
  });

  ruler.push("jumpto", {
    tag: "jumpto",
    wrap: wrap("a", "href", tagInfo => "#" + tagInfo.attrs._default)
  });

  ["left", "right", "center"].forEach(dir => {
    md.block.bbcode.ruler.push(dir, {
      tag: dir,
      wrap: function (token) {
        token.attrs = [["style", "text-align:" + dir]];
        return true;
      }
    });
  });

  md.block.bbcode.ruler.push("indent", {
    tag: "indent",
    wrap: "blockquote.indent"
  });

  ["ot", "edit"].forEach(tag => {
    md.block.bbcode.ruler.push("ot", {
      tag: tag,
      before: function (state) {
        let token = state.push("sepquote_open", "div", 1);
        token.attrs = [["class", tag]];

        token = state.push("span_open", "span", 1);
        token.block = false;
        token.attrs = [["class", "smallfont"]];

        token = state.push("text", "", 0);
        token.content = I18n.t("bbcode." + tag);

        token = state.push("span_close", "span", -1);

      },
      after: function (state) {
        state.push("sepquote_close", "div", -1);
      }
    });
  });

  ["list", "ul", "ol"].forEach(tag => {
    md.block.bbcode.ruler.push(tag, {
      tag: tag,
      replace: function (state, tagInfo, content) {
        let ol = tag === "ol" || (tag === "list" && tagInfo.attrs._default);
        let token;

        if (ol) {
          token = state.push("ordered_list_open", "ol", 1);
          if (tagInfo.attrs._default) {
            token.attrs = [["type", tagInfo.attrs._default]];
          }
        } else {
          state.push("bullet_list_open", "ul", 1);
        }

        let lines = content.split("\n");
        let list = [null];
        let index = 0;

        for (let i = 0; i < lines.length; i++) {
          let line = lines[i];

          let match = line.match(/^\s*\[?\*\]?(.*)/);
          if (match) {
            index++;
            list[index] = match[1];
            continue;
          }

          match = line.match(/\s*\[li\](.*)\[\/li\]\s*$/);
          if (match) {
            index++;
            list[index] = match[1];
            continue;
          }

          if (list[index]) {
            list[index] += "\n" + line;
          } else {
            list[index] = line;
          }
        }

        list.forEach(li => {
          if (li !== null) {
            state.push("list_item_open", "li", 1);
            // a bit lazy, we could use a block parser here
            // but it means a lot of fussing with line marks
            token = state.push("inline", "", 0);
            token.content = li;
            token.children = [];

            state.push("list_item_close", "li", -1);
          }
        });

        if (ol) {
          state.push("ordered_list_close", "ol", -1);
        } else {
          state.push("bullet_list_close", "ul", -1);
        }

        return true;
      }
    });
  });

  md.block.bbcode.ruler.push("spoiler", {
    tag: "spoiler",
    before: function(state, tagInfo) {
      state.push("bbcode_open", "details", 1)
        .attrs = [["class", "spoiler"]];
      state.push("bbcode_open", "summary", 1)
        .attrs = [["class", "spoiler-title"]];
  
      let token = state.push("text", "", 0);
      token.content = "SPOILER - Click to view";
  
      state.push("bbcode_close", "summary", -1);
    },
  
    after: function(state) {
      state.push("bbcode_close", "details", -1);
    }
  });
}

export function setup(helper) {
  helper.whiteList([
    "div.highlight",
    "span.highlight",
    "span.djtitle",
    "span.ld",
    "span.nd",
    "span.fld",
    "span.hi",
    "span.faw",
    "span.com",
    "span.mod",
    "div.edit",
    "div.ot",
    "span.smallfont",
    "blockquote.indent",
    "span.colored",
    "font[color=*]",
    "font.colored",
    "font[style=\"font-size:*\"]",
    "ol[type=*]",
    "details.spoiler",
    "summary.spoiler-title"
  ]);

  helper.whiteList({
    custom(tag, name, value) {
      if (tag === "font" && name === "style") {
        return /^(font-size:(xx-small|x-small|small|medium|large|x-large|xx-large|([0-9][0-9]?[0-9]?\%)))$/.exec(
          value
        );
      }

      if (tag === "div" && name === "style") {
        return /^text-align:(center|left|right)$/.exec(value);
      }
    }
  });

  if (helper.markdownIt) {
    helper.registerPlugin(setupMarkdownIt);
    return;
  }

  helper.replaceBlock({
    start: /\[list=?(\w)?\]([\s\S]*)/gim,
    stop: /\[\/list\]/gim,
    emitter(blockContents, matches) {
      const contents = matches[1] ? ["ol", { type: matches[1] }] : ["ul"];

      if (blockContents.length) {
        blockContents.forEach(bc => {
          const lines = bc.split(/\n/);
          lines.forEach(line => {
            if (line.indexOf("[*]") === 0) {
              const li = this.processInline(line.slice(3));
              if (li) {
                contents.push(["li"].concat(li));
              }
            }
          });
        });
      }

      return contents;
    }
  });
}
