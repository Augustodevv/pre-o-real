"""Gera os ícones da extensão (etiqueta de preço com um "visto") em public/icon/."""
from PIL import Image, ImageDraw

GREEN = (5, 150, 105, 255)
DARK = (4, 120, 87, 255)
WHITE = (255, 255, 255, 255)


def draw(size: int) -> Image.Image:
    s = 1024  # desenha grande e reduz, para bordas suaves
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((32, 32, s - 32, s - 32), radius=230, fill=GREEN)
    # Etiqueta de preço inclinada, com o furo na ponta.
    tag = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    t = ImageDraw.Draw(tag)
    t.polygon([(330, 290), (680, 290), (820, 512), (680, 734), (330, 734)], fill=WHITE)
    t.rounded_rectangle((260, 290, 520, 734), radius=70, fill=WHITE)
    t.ellipse((640, 474, 716, 550), fill=GREEN)
    img.alpha_composite(tag.rotate(35, resample=Image.BICUBIC, center=(540, 512)))
    # "Visto" na horizontal, sobre o corpo da etiqueta.
    d = ImageDraw.Draw(img)
    pts = [(315, 560), (405, 650), (565, 475)]
    d.line(pts, fill=DARK, width=76, joint="curve")
    for x, y in (pts[0], pts[-1]):
        d.ellipse((x - 38, y - 38, x + 38, y + 38), fill=DARK)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    for size in (16, 32, 48, 96, 128):
        draw(size).save(f"public/icon/{size}.png")
    draw(512).save("docs/icone-512.png")
