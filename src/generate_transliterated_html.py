import os
import webvtt
import html
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# --- Configuration ---
vtt_folder = r"C:\Narayaneeyam_Combined\Audio_Sync_S_Verses_Only\vtt_all"
output_html_file = "narayaneeyam_transliteration.html"

def convert_vtt_to_transliterated_html(vtt_dir, output_file):
    all_text_content = []
    vtt_files = sorted([f for f in os.listdir(vtt_dir) if f.endswith('.vtt')])

    if not vtt_files:
        print(f"No VTT files found in {vtt_dir}")
        return

    all_text_content.append('<main>')

    for vtt_filename in vtt_files:
        vtt_path = os.path.join(vtt_dir, vtt_filename)
        print(f"Processing {vtt_filename} for transliteration...")

        try:
            captions = webvtt.read(vtt_path)
            chapter_id_root, _ = os.path.splitext(vtt_filename)
            chapter_id = chapter_id_root.replace(' ', '-').lower()
            chapter_title = chapter_id_root.replace('_', ' ')

            all_text_content.append(f'<section id="{chapter_id}">')
            all_text_content.append(f'<h2 data-chapter="{html.escape(chapter_title)}">{html.escape(chapter_title)}</h2>')

            for i, caption in enumerate(captions):
                raw_text = caption.text.strip()
                transliterated_text = transliterate(raw_text, sanscript.DEVANAGARI, sanscript.IAST)
                escaped_text = html.escape(transliterated_text).replace('\n', '<br>')
                
                cue_id = f"cue_{chapter_id}_{i}"
                
                all_text_content.append(
                    f'<p id="{cue_id}" data-start="{caption.start}" data-end="{caption.end}">'
                    f'{escaped_text}</p>'
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
    <title>Narayaneeyam Transliteration Compilation</title>
</head>
<body>
    <header>
        <h1>Narayaneeyam Transliteration Compilation</h1>
    </header>
    {" ".join(all_text_content)}
</body>
</html>
    """

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_template)

    print(f"\nHTML file '{output_file}' generated successfully!")

if __name__ == "__main__":
    convert_vtt_to_transliterated_html(vtt_folder, output_html_file)
