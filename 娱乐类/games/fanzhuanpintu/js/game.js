//根据游戏的难易系数，改变方块的多少、大小、间距
function SetStyle() { }
SetStyle.prototype.setGridSize = function (level) {
    var margin = this.getMargin(level);
    var res = ($(".container").width() - margin * level) / level;

    // 设置块的大小和间距
    $(".gamesquare").css("margin-right", margin);
    $(".gamesquare").css("width", res);
    $(".gamesquare").css("height", res);

    // 设置每行的高度、右边距和下边距
    $(".gamerow").css("height", res);
    $(".gamerow").css("margin-right", margin * -1);
    $(".gamerow").css("margin-bottom", margin);

    // 设置游戏区域的内边距
    $(".board").css("padding", margin);
    $(".board").css("padding-bottom", 0);
};
SetStyle.prototype.getMargin = function (level) {
    if (level <= 6) return 15;
    if (level > 15) return 5;
    return 20 - level;
};

// Game构造函数
function Game() {
    // 游戏级别
    this.level = 1;
    // 创建用于控制游戏的对象
    this.gb;
    this.sh = new SetStyle();
}
// Game类的原型方法，具体的游戏控制 注意重置this指向
Game.prototype = {
    processClick: function (w, h) {
        this.gb.processClick(w, h);
        this.updateCounts();
        if (this.gb.isGameWin()) {
            this.gameEnd();
        }
    },
    // 开始游戏
    beginGame: function () {
        this.setupLevel();
    },
    // 游戏结束
    gameEnd: function () {
        this.level++;
        this.resetGame();
    },
    // 重置游戏 this 通过bind 实现重定向
    resetGame: function () {
        $("#levelDescriptor").html("进入级别 " + this.level);
        setTimeout(
            function () {
                this.setupLevel(); //不重置this指向时 this指向的是window
            }.bind(this),
            500,
        ); //使用bind 将this指向从window 指向到实例
    },
    // 设置难易级别
    setupLevel: function () {
        this.gb = new GameBoard(this.level, this.level);
        $(".board").html(""); // 清空游戏面板
        this.gb.populate(); // 重置所有图块为橙色
        this.gb.renderBoard(); // 渲染游戏面板并创建图块
        this.sh.setGridSize(this.level); // 控制游戏区域中的块大小
        this.updateCounts(); // 更新显示当前级别
        this.applyBindings(); // 翻转所点图块周围图块的颜色
    },
    // 显示当前级别
    updateCounts: function () {
        $(".currLevel").html("当前级别: <b>" + this.level + "</b>");
    },
    applyBindings: function () {
        var that = this; //dom事件回调前将this保存为变量 方便使用
        $(".gamesquare").click(function () {
            // 获取所点击的图块的位置
            var cname = $(this).attr("class").split(" ")[1];
            var coord = cname.substring(5).split("q");
            var height = parseInt(coord[1]);
            var width = parseInt(coord[0]);
            that.processClick(width, height);
        });
    },
    onNewGameClick: function () {
        this.level = 1;
        this.setupLevel();
    },
};
// xPos,yPos方块横纵坐标
function GameBoard(xPos, yPos) {
    // 游戏面板
    // 图块坐标
    this.high = yPos - 1; //下标由0开始
    this.wide = xPos - 1; //下标由0开始
    this.count = 0;
    // 横向坐标为 wide，纵向坐标为 high
    //    [0][0] |  [0][1]
    //  - - - - - - - - - - - -
    //    [1][0] |  |[1][1]

    // 创建图块二维数组
    this.board = new Array(xPos);
    for (var i = 0; i <= this.wide; i++) {
        this.board[i] = new Array(yPos);
    }
}
//游戏规则实现
GameBoard.prototype = {
    renderBoard: function () {
        var htmlString = ""; //游戏方块 结构
        for (var j = 0; j <= this.high; j++) {
            htmlString += "<div class='gamerow'>";
            for (var i = 0; i <= this.wide; i++) {
                htmlString += "<div class='gamesquare coord" + i + "q" + j + "'></div>";
            }
            htmlString += "</div>";
        }
        $(".board").html(htmlString);

        for (var i = 0; i <= this.wide; i++) {
            for (var j = 0; j <= this.high; j++) {
                this.processCLickView(i, j);
            }
        }
    },
    processClick: function (w, h) {
        //
        // 翻转所点图块周围图块的颜色
        //

        // 找到所点图块周围需要翻转颜色的图块
        var lowx = w - 1;
        var highx = w + 1;
        var lowy = h - 1;
        var highy = h + 1;

        // 检查被点击的图块是否是边缘图块
        if (w == 0) lowx = 0;
        if (w == this.wide) highx = this.wide;
        if (h == 0) lowy = 0;
        if (h == this.high) highy = this.high;

        // 翻转所点图块垂直方向的图块
        for (var i = lowy; i <= highy; i++) {
            if (this.board[w][i] == 0) {
                this.board[w][i] = 1;
                this.count++;
            } else {
                this.board[w][i] = 0;
                this.count--;
            }
            this.processCLickView(w, i);
        }

        // 翻转所点图块水平方向的图块
        for (var i = lowx; i <= highx; i++) {
            if (i == w) continue;
            if (this.board[i][h] == 0) {
                this.board[i][h] = 1;
                this.count++;
            } else {
                this.board[i][h] = 0;
                this.count--;
            }
            this.processCLickView(i, h);
        }
    },
    // 翻转图块颜色
    processCLickView: function (w, h) {
        var coord = ".coord" + w + "q" + h;
        if (this.board[w][h] == 0) {
            $(coord).css("background-color", "#e8BB39");
        } else {
            $(coord).css("background-color", "#6060e0");
        }
    },

    // 重置所有图块为橙色
    populate: function () {
        for (var i = 0; i <= this.wide; i++) {
            for (var j = 0; j <= this.high; j++) {
                this.board[i][j] = 0;
            }
        }
    },

    // 游戏胜利
    isGameWin: function () {
        return this.count == (this.wide + 1) * (this.high + 1);
    },
};

// 初始化游戏
$(document).ready(function () {
    // 创建游戏
    var game = new Game();
    // 开始游戏
    game.beginGame();

    // 重置游戏区域图块
    $("#resetLevelConfirm").click(function () {
        game.setupLevel();
    });

    // 开始新游戏
    $("#newGameConfirm").click(function () {
        game.onNewGameClick();
    });
});