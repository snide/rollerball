#!/usr/bin/env fish

# Get the full path to the directory containing this script so we can run the TypeScript scripts
set script_dir (dirname (status --current-filename))
cd $script_dir

function rollerball
    # Check for '-e' flag for edit mode
    if test "$argv[1]" = "-e"
        # Remove the '-e' from the arguments list
        set -e argv[1]

        # If an ID is provided after '-e', use it; otherwise, start a new record
        if test (count $argv) -ge 1
            # Edit an existing record or create a new one
            ts-node ./edit.ts $argv
        else
            echo "No ID provided. Starting a new record."
            ts-node ./edit.ts
        end
    else
        # Search mode
        # Run the fetch TypeScript script and capture its output
        set records (ts-node ./fetch.ts $argv)

        # Check if records is not empty
        if test -z "$records"
            echo "No records found."
            exit 1
        end

        # Pass the raw output to column to format it into a table, ensuring tabs as the output separator
        set formatted_records (printf "%s\n" $records | awk -F '\t' '{printf "%s\t%s\t%s\t%s\n", $1, $2, $3, $4}' | column -t -s (printf '\t') --output-separator (printf '\t'))

        # Define ANSI color code for resetting to default colors
        set color_reset (printf '\033[0m')
        set color_primary (printf '\033[34m')  # Blue, change the number for different colors
        set color_secondary (printf '\033[32m') # Green, change the number for different colors

        # Define the key binding for editing
        set edit_key_binding "ctrl-e:execute(ts-node ./edit.ts {1} > /dev/tty)+abort"

        # Pass the formatted table to fzf and capture the selection
        set selected (printf "%s\n" $formatted_records | fzf -m --reverse --preview "
            echo {} | awk -F '\\t' '{
                printf \"%s%s%s. %s%s%s\\n  %s> %s%s\\n  %s# Tags: %s%s\\n\",
                \"$color_primary\", \$1, \"$color_reset\",
                \"$color_secondary\", \$2, \"$color_reset\",
                \"$color_reset\", \$3, \"$color_reset\",
                \"$color_reset\", \$4, \"$color_reset\"
            }'
        " --preview-window down:5 --bind $edit_key_binding)

        # Extract the URL from the selection, which is the third column
        set selected_url (printf "%s\n" $selected | awk -F (printf '\t') '{print $3}')

        # Open the URL
        if test -n "$selected_url"
            xdg-open $selected_url
        else
            echo "No selection made."
        end
    end
end

rollerball $argv
