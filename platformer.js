// # Quintus platformer example
//
// [Run the example](../quintus/examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a zone json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player.
window.addEventListener("load",function() {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = window.Q = Quintus({audioSupported: [ 'wav','mp3','ogg' ]})
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls(true).touch()
        // Enable sounds.
        .enableSound();
        
        Q.input.joypadControls();


// Load and init audio files.
var unfollowBottomLimit;
var resetBottomLimit;
var x1; //co-ordinate of which zone
var y1; //co-ordianate of which zone
var metroKey;
var lavaKey;
var pts;
var questionText;
var choiceText;

Q.SPRITE_PLAYER = 1;
Q.SPRITE_COLLECTABLE = 2;
Q.SPRITE_ENEMY = 4;
Q.SPRITE_DOOR = 8;
Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p, {
      sheet: "player",  // Setting a sprite sheet sets sprite width and height
      sprite: "player",
      direction: "right",
      standingPoints: [ [ -4, 22], [ -11, 17 ], [-11,-24], [11,-24], [11, 17 ], [ 8, 22 ]],
      duckingPoints : [ [ -8, 22], [ -11, 17 ], [-11,-5], [11,-5], [11, 17 ], [ 8, 22 ]],
      jumpSpeed: -600,
      speed: 400,
      strength: 150,
      score: 0,
      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE
    });

    this.p.points = this.p.standingPoints;

    this.add('2d, platformerControls, animation, tween');

    this.on("bump.top","breakTile");

    this.on("sensor.tile","checkLadder");
    this.on("enemy.hit","enemyHit");
    this.on("jump");
    this.on("jumped");

    Q.input.on("down",this,"checkDoor");
  },

  jump: function(obj) {
    // Only play sound once.
    if (!obj.p.playedJump) {
      Q.audio.play('jump.mp3');
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  checkLadder: function(colObj) {
    if(colObj.p.ladder) 
    { 
      this.p.onLadder = true;
      this.p.ladderX = colObj.p.x;

    }
  },

  checkDoor: function() {
    this.p.checkDoor = true;
  },

  resetzone: function() {
    Q.stageScene("zone1-1");
    this.p.strength = 100;
    this.animate({opacity: 1});
    Q.stageScene('hud', 3, this.p);
  },

  enemyHit: function(data) 
  {
    var col = data.col;
    var enemy = data.enemy;
    this.p.vy = -150;
    if (col.normalX == 1)
    {
      // Hit from left.
      this.p.x -=15;
      this.p.y -=15;
    }
    else 
    {
      // Hit from right;
      this.p.x +=15;
      this.p.y -=15;
    }
    this.p.immune = true;
    this.p.immuneTimer = 0;
    this.p.immuneOpacity = 1;
    this.p.strength -= 25;
    
    Q.stageScene('hud', 3, this.p);
    if (this.p.strength == 0) 
    {
      this.resetzone();
    }
  },

  continueOverSensor: function() {
    this.p.vy = 0;
    if(this.p.vx != 0) {
      this.play("walk_" + this.p.direction);
    } else {
      this.play("stand_" + this.p.direction);
    }
  },

  breakTile: function(col) 
  {
    if(col.obj.isA("TileLayer")) 
    {
      if(col.tile == 78) 
      { 
          col.obj.setTile(col.tileX,col.tileY, 77);
          metroKey = true;
      }
     else if(col.tile == 77) 
     { 
          col.obj.setTile(col.tileX,col.tileY, 78);
          metroKey = false;

     }
     
      if(col.tile == 66) 
      { 
          col.obj.setTile(col.tileX,col.tileY, 65);
          lavaKey = true;
      }
     else if(col.tile == 65) 
     { 
          col.obj.setTile(col.tileX,col.tileY, 66);
          lavaKey = false;

     }
     
     if(col.tile == 48 || col.tile == 60 || col.tile == 72 || col.tile == 84)
     {
         col.obj.setTile(col.tileX, col.tileY, 2);
         pts  -= 50;
         Q.stageScene('hud', 3, this.p);
         //stage.insert(new Q.Enemy{x: 64, y: 2100});
     }
     
     if (col.tile == 1 || col.tile == 12|| col.tile == 24 || col.tile == 36)
     {
         col.obj.setTile(col.tileX, col.tileY, 3);
         pts += 25;
         Q.stageScene('hud', 3, this.p);
     }
    }
    Q.audio.play('coin.mp3');
  },

  step: function(dt) {
    var processed = false;
    if (this.p.immune) {
      // Swing the sprite opacity between 50 and 100% percent when immune.
      if ((this.p.immuneTimer % 12) == 0) {
        var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
        this.animate({"opacity":opacity}, 0);
        this.p.immuneOpacity = opacity;
      }
      this.p.immuneTimer++;
      if (this.p.immuneTimer > 144) {
        // 3 seconds expired, remove immunity.
        this.p.immune = false;
        this.animate({"opacity": 1}, 1);
      }
    }

    if(this.p.onLadder) {
      this.p.gravity = 0;

      if(Q.inputs['up']) {
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else {
        this.continueOverSensor();
      }
      processed = true;
    } 
      
    if(!processed && this.p.door) {
      this.p.gravity = 1;
      if(this.p.checkDoor && this.p.landed > 0) {
        // Enter door.
        this.p.y = this.p.door.p.y;
        this.p.x = this.p.door.p.x;
        this.play('climb');
        this.p.toDoor = this.p.door.findLinkedDoor();
        processed = true;
      }
      else if (this.p.toDoor) {
        // Transport to matching door.
        this.p.y = this.p.toDoor.p.y;
        this.p.x = this.p.toDoor.p.x;
        this.stage.centerOn(this.p.x, this.p.y);
        this.p.toDoor = false;
        this.stage.follow(this);
        processed = true;
      }
    } 
      
    if(!processed) { 
      this.p.gravity = 1;

      if(Q.inputs['down'] && !this.p.door) {
        this.p.ignoreControls = true;
        this.play("duck_" + this.p.direction);
        if(this.p.landed > 0) {
          this.p.vx = this.p.vx * (1 - dt*2);
        }
        this.p.points = this.p.duckingPoints;
      } else {
        this.p.ignoreControls = false;
        this.p.points = this.p.standingPoints;

        if(this.p.vx > 0) {
          if(this.p.landed > 0) {
            this.play("walk_right");
          } else {
            this.play("jump_right");
          }
          this.p.direction = "right";
        } else if(this.p.vx < 0) {
          if(this.p.landed > 0) {
            this.play("walk_left");
          } else {
            this.play("jump_left");
          }
          this.p.direction = "left";
        } else {
          this.play("stand_" + this.p.direction);
        }
           
      }
    }

    this.p.onLadder = false;
    this.p.door = false;
    this.p.checkDoor = false;


    if(this.p.y > unfollowBottomLimit) 
    {
      this.stage.unfollow();
    }
    

//This section tells the game what to do when the player moves from one 80 by 80 block zone to another. Each corner defaults to 2 blocks (64 pixels margin except to top left's vertical position, top right vertical position, and spawn at bottom to compensate for gravity and make it easier for the player to move without falling back down to soon)

    if(this.p.y > 1280) //player goes down to next zone
    {
        y1 += 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 640, y: 64}); //spawn at top middle
    }
    
    if(this.p.y < 0) //goes up to zone above
    {
        y1 -= 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 640, y: 1024}); //spawn at bottom middle with 8-block height to prevent player from falling back
    }
    
    if(this.p.x > 1280 && this.p.y > 0 && this.p.y < 640) //goes right from top
    {
        x1 += 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 64, y: 256}); //spawn player at floor height, eight blocks down
    }
    
    if(this.p.x > 1280 && this.p.y >= 640 && this.p.y < 1280) //goes right from bottom
    {
        x1 += 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 64, y: 1216}); //spawn player at bottom left
    }
    
    if(this.p.x < 0 && this.p.y > 0 && this.p.y < 640) //goes right from top
    {
        x1 -= 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 1024, y: 256}); //spawn player at top right, 8 blocks down
    }
    
    if(this.p.x < 0 && this.p.y >= 640 && this.p.y < 1280) //goes right from bottom
    {
        x1 -= 1;
        Q.stageScene("zone" + String(x1) + "-" + String(y1));
        Q.stageScene('hud', 3, this.p);
        Q("Player").first().set({x: 1216, y: 1024}); //spawn player at bottom right
    }
    
    

    

        
  //if(this.p.x > 14000 && zone == 3)
      //{
      //  this.x -= 500; //to prevent other if's from becoming true and executing!!!!!!!!!!!!!!!!!
      //  Q.stageScene("metroEscape");
       // Q("Player").first().set({x: 140, y: 420});
     // }
  //  }
    
   // if(this.p.y > resetBottomLimit) 
    //{
      //this.resetzone();
   // }
    

  }
});

Q.Sprite.extend("Enemy", {
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: 50,
      defaultDirection: 'left',
      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT
    }));

    this.add("2d, aiBounce, animation");
    this.on("bump.top",this,"die");
    this.on("hit.sprite",this,"hit");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }
    var p = this.p;

    p.vx += p.ax * dt;
    p.vy += p.ay * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.play('walk');
  },

  hit: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
      Q.audio.play('hit.mp3');
    }
  },

  die: function(col) {
    if(col.obj.isA("Player")) {
      Q.audio.play('coin.mp3');
      this.p.vx=this.p.vy=0;
      this.play('dead');
      this.p.dead = true;
      var that = this;
      col.obj.p.vy = -300;
      this.p.deadTimer = 0;
    }
  }
});

Q.Enemy.extend("Fly", {

});

Q.Enemy.extend("Slime", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 34
    });
  }
});

Q.Enemy.extend("Snail", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 36
    });
  }

});

Q.Sprite.extend("Collectable", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.amount) {
      colObj.p.score += this.p.amount;
      Q.stageScene('hud', 3, colObj.p);
    }
    Q.audio.play('coin.mp3');
    this.destroy();
  }
});

Q.Sprite.extend("Door", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_DOOR,
      collisionMask: Q.SPRITE_NONE,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },
  findLinkedDoor: function() {
    return this.stage.find(this.p.link);
  },
  // When the player is in the door.
  sensor: function(colObj) {
    // Mark the door object on the player.
    colObj.p.door = this;
  }
});

Q.Collectable.extend("Heart", {
  // When a Heart is hit.
  sensor: function(colObj) {
    // Increment the strength.
    if (this.p.amount) {
      colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
      Q.stageScene('hud', 3, colObj.p);
      Q.audio.play('heart.mp3');
    }
    this.destroy();
  }
});





Q.scene("zone1-1",function(stage)
{
  
  stage.insert(new Q.Repeater({ asset: "10.png", speedX: 0.8, speedY: 0.8, repeatY: true, repeatX: true, scale: 0.80 }));
  Q.stageTMX("zone1-1.tmx", stage);
  Q.audio.stop();
  Q.audio.play('zone1-1.mp3', {loop: true});
  stage.add("viewport").follow(Q("Player").first(), {x: true, y: true}, { minX: 0, maxX: 1280, minY: 0, maxY: 1280 });

  
  unfollowBottomLimit = 1280;
 // resetBottomLimit = 3260;
 x1 = 1;
 y1 = 1;
 questionText = "4 cubed is?";
 choiceText = "A: 32\r  B: 64 \r C: 12  \rD:256";
 
  

});

Q.scene("zone1-2",function(stage)
{
  stage.insert(new Q.Repeater({ asset: "10.png", speedX: 0.8, speedY: 0.8, repeatY: true, repeatX: true, scale: 0.80 }));
  Q.stageTMX("zone1-2.tmx", stage);
  //Q.audio.stop();
  //Q.audio.play('zone1-1.mp3', {loop: true});
  stage.add("viewport").follow(Q("Player").first(), {x: true, y: true}, { minX: 0, maxX: 1280, minY: 0, maxY: 1280 });

  
  unfollowBottomLimit = 1280;
 // resetBottomLimit = 3260;
  x1 = 1;
  y1 = 2;
  questionText = "2c 9f 4j ?";
  choiceText = "? = A: 18o\r  B: 3k\r  C:2o\r  D: 18k\r";
  

});



/*
Q.scene("metro",function(stage)
{
  
  stage.insert(new Q.Repeater({ asset: "metro.png", speedX: 0.8, speedY: 0.8, repeatY: true, repeatX: true, scale: 1.00 }));
  Q.stageTMX("metro.tmx", stage);
  Q.audio.stop();
  Q.audio.play('metro.mp3', {loop: true});
  stage.add("viewport").follow(Q("Player").first(), {x: true, y: true},  {minX: 0, maxX: 14000, minY: 0, maxY: 1120 });
  
  unfollowBottomLimit = 1120;
  resetBottomLimit = 1820;
  zone = 2;

});
*/






Q.scene('hud',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 100, y: 0
  }));

  var strength = container.insert(new Q.UI.Text({x:100, y: 0,
    label: 'Health: ' + stage.options.strength + '%', color: "white" }));

  var label = container.insert(new Q.UI.Text({x:100, y: 25,
    label: "" + pts + "      " + x1 + "-" + y1, color: "white" }));

  var label = container.insert(new Q.UI.Text({x:100, y: 50,
    label: questionText, color: "white" }));
    
  var label = container.insert(new Q.UI.Text({x:100, y: 75,
    label: choiceText, color: "white" }));

  container.fit(20);
});



Q.loadTMX("zone1-1.tmx, zone1-2.tmx, 1.png, 2.png, 3.png, 4.png, 10.png, collectables.json, doors.json, enemies.json, zone1-1.mp3, metro.mp3, fire.mp3, jump.mp3, heart.mp3, hit.mp3, coin.mp3, player.json, player.png", function() {
    Q.compileSheets("player.png","player.json");
    Q.compileSheets("collectables.png","collectables.json");
    Q.compileSheets("enemies.png","enemies.json");
    Q.compileSheets("doors.png","doors.json");
    Q.animations("player", {
      walk_right: { frames: [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip: false, loop: true },
      walk_left: { frames:  [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip:"x", loop: true },
      jump_right: { frames: [13], rate: 1/10, flip: false },
      jump_left: { frames:  [13], rate: 1/10, flip: "x" },
      stand_right: { frames:[14], rate: 1/10, flip: false },
      stand_left: { frames: [14], rate: 1/10, flip:"x" },
      duck_right: { frames: [15], rate: 1/10, flip: false },
      duck_left: { frames:  [15], rate: 1/10, flip: "x" },
      climb: { frames:  [16, 17], rate: 1/3, flip: false }
    });
    var EnemyAnimations = {
      walk: { frames: [0,1], rate: 1/3, loop: true },
      dead: { frames: [2], rate: 1/10 }
    };
    Q.animations("fly", EnemyAnimations);
    Q.animations("slime", EnemyAnimations);
    Q.animations("snail", EnemyAnimations);
    pts = 0;
    Q.stageScene("zone1-1");
    Q.stageScene('hud', 3, Q('Player').first().p);
  
}, {
  progressCallback: function(loaded,total) {
    var element = document.getElementById("loading_progress");
    element.style.width = Math.floor(loaded/total*100) + "%";
    if (loaded == total) {
      document.getElementById("loading").remove();
    }
  }
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify zone.json to change the zone around and add in some more enemies.
// 2. Add in a second zone by creating a zone2.json and a zone2 scene that gets
//    loaded after zone 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});