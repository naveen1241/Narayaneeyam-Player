import os
import webvtt
import html
import re

# --- Configuration ---
vtt_folder = r"C:\Narayaneeyam_Combined\Audio_Sync_S_Verses_Only\vtt_all"
output_html_file = "narayaneeyam_text.html"

def ends_with_shloka_marker(text):
    """
    Checks if a string ends with the Devanagari shloka verse marker
    pattern, like "॥ १ ॥", "।", or "॥", preceded by Devanagari script.
    """
    if not text:
        return False
    
    # Regex pattern:
    # ^[\u0900-\u097F\s\u0964\u0965]*: Matches zero or more Devanagari characters, spaces, and danda markers from the start.
    # ( ... ): A capturing group for the verse marker part.
    #   ॥\s*[\u0966-\u096F]+\s*॥: Double danda with number.
    #   |: OR
    #   ॥: Double danda.
    #   |: OR
    #   ।: Single danda.
    # \s*$: Matches optional trailing whitespace until the end of the string.
    shloka_pattern = r'[\u0900-\u097F\s\u0964\u0965]*(\s*॥\s*[\u0966-\u096F]+\s*॥|\s*॥|\s*।)\s*$'
    
    match = re.search(shloka_pattern, text)
    if match:
        return True
    
    return False

def convert_vtt_to_html(vtt_dir, output_file):
    """
    Extracts text from VTT files and generates a single HTML file
    containing the text for all chapters.
    """
    all_text_content = []
    vtt_files = sorted([f for f in os.listdir(vtt_dir) if f.endswith('.vtt')])

    if not vtt_files:
        print(f"No VTT files found in {vtt_dir}")
        return

    all_text_content.append('<main>')

    for vtt_filename in vtt_files:
        vtt_path = os.path.join(vtt_dir, vtt_filename)
        print(f"Processing {vtt_filename}...")

        try:
            captions = webvtt.read(vtt_path)

            chapter_id_root, _ = os.path.splitext(vtt_filename)
            chapter_id = chapter_id_root.replace(' ', '-').lower()
            chapter_title = chapter_id_root.replace('_', ' ')

            all_text_content.append(f'<section id="{chapter_id}">')
            all_text_content.append(f'<h2 data-chapter="{html.escape(chapter_title)}">{html.escape(chapter_title)}</h2>')

            for i, caption in enumerate(captions):
                raw_text = caption.text.strip()
                escaped_text = html.escape(raw_text).replace('\n', '<br>')
                
                if ends_with_shloka_marker(raw_text):
                    text_content = f"<span class='cue-text'>{escaped_text}</span>"
                else:
                    text_content = escaped_text
                
                cue_id = f"cue_{chapter_id}_{i}"
                
                all_text_content.append(
                    f'<p id="{cue_id}" data-start="{caption.start}" data-end="{caption.end}">'
                    f'{text_content}</p>'
                )

            all_text_content.append('</section>')

        except webvtt.MalformedFileError as e:
            print(f"Error parsing {vtt_filename}: {e}")
            all_text_content.append('<section>')
            all_text_content.append(f'<h2>Error processing {html.escape(vtt_filename)}</h2>')
            all_text_content.append(f'<p>There was an error reading this VTT file: {html.escape(str(e))}</p>')
            all_text_content.append('</section>')

    all_text_content.append('</main>')

    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Narayaneeyam Text Compilation</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 20px; }}
        h1 {{ color: #2e8b57; }}
        h2 {{ margin-top: 40px; color: #2e8b57; border-bottom: 2px solid #ccc; padding-bottom: 5px; }}
        p {{ margin: 10px 0; }}
        .cue-text {{
            font-size: 1.25em;
            color: #004d40;
        }}
    </style>
</head>
<body>
    <header>
        <h1>Narayaneeyam Text Compilation</h1>
    </header>
    {" ".join(all_text_content)}
    <footer>
        <p>&copy; {os.path.basename(os.path.normpath(vtt_folder))} | Generated on {os.path.getmtime(vtt_dir)}</p>
    </footer>
</body>
</html>
    """

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_template)

    print(f"\nHTML file '{output_file}' generated successfully!")

# --- Run the conversion ---
if __name__ == "__main__":
    convert_vtt_to_html(vtt_folder, output_html_file)
