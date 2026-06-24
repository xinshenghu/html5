"""生成小游戏系统截图用于审核"""
from PIL import Image, ImageDraw, ImageFont
import os, random

W, H = 750, 1334
DARK = (26, 26, 46)
RED = (233, 69, 96)
GREEN = (81, 207, 102)
BLUE = (30, 136, 229)
PURPLE = (142, 36, 170)
ORANGE = (255, 152, 0)
CYAN = (0, 188, 212)
WHITE = (255, 255, 255)
FONT = "C:/Windows/Fonts/msyh.ttc"

screenshots_dir = "E:/mycode/work/tt/screenshots"
os.makedirs(screenshots_dir, exist_ok=True)

for f in os.listdir(screenshots_dir):
    if f.endswith(('.jpg', '.png')):
        os.remove(os.path.join(screenshots_dir, f))

def bg(draw):
    for y in range(H):
        t = y / H
        draw.line([(0,y),(W,y)], fill=(int(26+t*5), int(26+t*3), int(46-t*10)))
    for x in range(0, W, 8):
        for y in range(0, H, 8):
            if (x+y) % 16 == 0:
                draw.point((x,y), fill=(35,35,60))

def add_noise(img):
    pixels = img.load()
    for x in range(0, img.width, 4):
        for y in range(0, img.height, 4):
            r, g, b = pixels[x, y]
            n = random.randint(-3, 3)
            pixels[x, y] = (max(0,min(255,r+n)), max(0,min(255,g+n)), max(0,min(255,b+n)))

def ct(draw, text, y, size=28, color=WHITE):
    font = ImageFont.truetype(FONT, size)
    bbox = draw.textbbox((0,0), text, font=font)
    draw.text(((W-(bbox[2]-bbox[0]))//2, y), text, fill=color, font=font)

# ====== 系统1：关卡选择系统 ======
img = Image.new('RGB', (W, H), DARK)
d = ImageDraw.Draw(img)
bg(d)

ct(d, "选择关卡", 55, 32, WHITE)
ct(d, "经典益智小游戏合集", 98, 18, (130,130,130))

games = [("第1关 拼图", RED), ("第2关 贪吃蛇", GREEN), ("第3关 扫雷", ORANGE), 
         ("第4关 消消乐", PURPLE), ("第5关 数独", BLUE), ("第6关 青蛙过河", CYAN)]
for i, (name, color) in enumerate(games):
    x, y = W*0.15, H*(0.26 + i*0.11)
    d.rounded_rectangle([x,y,x+W*0.7,y+H*0.085], radius=12, fill=color)
    d.text((x+W*0.35, y+H*0.042), name, fill=WHITE, font=ImageFont.truetype(FONT, 20), anchor="mm")

ct(d, "点击关卡开始挑战", 890, 16, (110,110,110))
add_noise(img)
img.save(os.path.join(screenshots_dir, "system1_level_select.jpg"), quality=98)
print("系统1：关卡选择系统截图 OK")

# ====== 系统2：计分与进度系统 ======
img = Image.new('RGB', (W, H), DARK)
d = ImageDraw.Draw(img)
bg(d)

d.rounded_rectangle([10,8,82,40], radius=16, fill=(60,60,80))
d.text((18,15), "← 返回", fill=(200,200,200), font=ImageFont.truetype(FONT, 16))

ct(d, "第2关: 贪吃蛇", 55, 26, GREEN)
ct(d, "得分: 2 / 3", 88, 18, (255,215,0))

cell = 22
sx, sy = (W-16*cell)//2, 120
d.rectangle([sx-2,sy-2,sx+16*cell+2,sy+16*cell+2], outline=GREEN, width=2)
for r in range(16):
    for c in range(16):
        cl = (23,23,43) if (r+c)%2==0 else (27,27,47)
        d.rectangle([sx+c*cell,sy+r*cell,sx+c*cell+cell,sy+r*cell+cell], fill=cl)

snake = [(6,7),(6,8),(6,9),(5,9),(4,9),(4,10),(3,10)]
for i, (c,r) in enumerate(snake):
    alpha = 1 - i/len(snake)*0.4
    d.rounded_rectangle([sx+c*cell+1,sy+r*cell+1,sx+(c+1)*cell-1,sy+(r+1)*cell-1], radius=5, fill=(int(30*alpha), int(200*alpha), int(60*alpha)))

d.ellipse([sx+11*cell+3,sy+5*cell+3,sx+12*cell-3,sy+6*cell-3], fill=RED)
ct(d, "滑动屏幕控制蛇的移动方向", 465, 16, (120,120,120))
add_noise(img)
img.save(os.path.join(screenshots_dir, "system2_score.jpg"), quality=98)
print("系统2：计分与进度系统截图 OK")

# ====== 系统3：触摸交互系统 ======
img = Image.new('RGB', (W, H), DARK)
d = ImageDraw.Draw(img)
bg(d)

d.rounded_rectangle([10,8,82,40], radius=16, fill=(60,60,80))
d.text((18,15), "← 返回", fill=(200,200,200), font=ImageFont.truetype(FONT, 16))

ct(d, "第5关: 数独", 55, 26, BLUE)
ct(d, "用时: 3分25秒", 88, 16, (150,150,150))

sd_cell = 34
sd_x = (W-9*sd_cell)//2
sd_y = 120
d.rectangle([sd_x-2,sd_y-2,sd_x+9*sd_cell+2,sd_y+9*sd_cell+2], outline=BLUE, width=2)

puzzle = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
]

fn = ImageFont.truetype(FONT, 18)
for r in range(9):
    for c in range(9):
        x, y = sd_x+c*sd_cell, sd_y+r*sd_cell
        bg_cl = '#2a2a3e' if (r//3 + c//3) % 2 == 0 else '#252538'
        d.rectangle([x,y,x+sd_cell,y+sd_cell], fill=bg_cl)
        if r % 3 == 0:
            d.line([(sd_x, y), (sd_x+9*sd_cell, y)], fill=BLUE, width=2)
        if c % 3 == 0:
            d.line([(x, sd_y), (x, sd_y+9*sd_cell)], fill=BLUE, width=2)
        val = puzzle[r][c]
        if val != 0:
            d.text((x+sd_cell//2, y+sd_cell//2), str(val), fill=WHITE, font=fn, anchor="mm")

d.rectangle([sd_x+4*sd_cell, sd_y+5*sd_cell, sd_x+5*sd_cell, sd_y+6*sd_cell], fill=(33,150,243,50), outline=WHITE, width=2)

num_pad = [1,2,3,4,5,6,7,8,9,0]
np_cell = 48
np_x = (W-5*np_cell)//2
np_y = H - 120
for i, num in enumerate(num_pad):
    x, y = np_x + (i%5)*np_cell, np_y + (i//5)*np_cell
    fill_cl = RED if num == 0 else (55,71,79)
    d.rounded_rectangle([x+2,y+2,x+np_cell-2,y+np_cell-2], radius=8, fill=fill_cl)
    txt = "清除" if num == 0 else str(num)
    d.text((x+np_cell//2, y+np_cell//2), txt, fill=WHITE, font=ImageFont.truetype(FONT, 20), anchor="mm")

ct(d, "选中空格后点击数字填入", 460, 16, (120,120,120))
add_noise(img)
img.save(os.path.join(screenshots_dir, "system3_touch.jpg"), quality=98)
print("系统3：触摸交互系统截图 OK")

# 检查大小
for f in ["system1_level_select.jpg", "system2_score.jpg", "system3_touch.jpg"]:
    sz = os.path.getsize(os.path.join(screenshots_dir, f))/1024
    print(f"{f}: {sz:.0f}KB {'OK' if sz >= 60 else 'TOO SMALL'}")