# Rollerball

Rollerball is a bookmark manager inspired by the excellent, feature rich [buku](https://github.com/jarun/buku). I didn't really use all the features in Buku, and wanted to use [Xata](https://xata.io) as the data store. The rollerball [Fish shell](https://fishshell.com/) script wraps some Node scripts and allows you to search against the Xata database using an [FZF](https://github.com/junegunn/fzf) CLI.

Rollerball handles data entry through your local `$EDTIOR`. For me that's [Neovim](https://neovim.io/)

## Dependencies

Rollerball is pretty specific and assumes you're running Fish on a Linux desktop of some sort.

- Fish
- Awk
- Node
- Xata

## Roll your own

1. Clone the repo, [install Xata](https://xata.io/docs/getting-started/installation)
2. cd into the directory
3. Run `xata init --codegen=xata.ts` picking TypeScript
4. Run `xata schema upload schema.json` and then `xata pull main`
5. Set up a way to invoke Rollerball. Here are two ways you could do it.

- Make a fish alias: `alias rollerball "~/path/to/rollerball.fish"`
- Set up a symlink: `ln -s /path/to/rollerball.fish /usr/local/bin/rollerball`

Now you should be able to run `rollerball -e` to create your first bookmark.

## Commands

### Searching

By default running `rollerball` will search through existing bookmarks through FZF. Passing a parameter to the default command will pre-search results using xata. For example `rollerball design` will search all fields for "design".

One search is loaded you can hit `CTRL-e` to edit the currently focused bookmark.

### Adding and editing bookmarks

Running `rollerball -e` will launch your editor and allow you to add a new bookmark. Passing it the bookmark's id (it's incremental number) `rollerball -e 2` will allow you to edit that specific bookmark.

## Xata

The primary purchase of this tool is to get data into a Xata database. At this point you can access your links from anywhere and build more specific tools.
