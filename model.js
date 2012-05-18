var Actor = function(data){
  var self = this;
  self.id = data.id;
  self.name = ko.observable(data.name);
  self.roles = ko.observableArray([]);
  self.sketches = ko.observableArray([]);
  self.disabled = ko.observable(false);
  
  self.addSketch = function(sketch){
    self.sketches.push(sketch);
  }
  
  self.removeSketch = function(sketch){
    self.sketches.remove(function(item){
      return item == sketch;
    });
  }

  self.addRole = function(data){
    var role = self.getRole(data);
    if(role == undefined)
      self.roles().push(data);
    return role;
  }

  self.getRole = function(data){
    for(var i in self.roles()){
      if(data.sketch == self.roles()[i].sketch)
        return self.roles()[i];
      return undefined;
    }
  }

  this.equals = function(obj){
    return (self.name == obj.name);
  }
}

var Role = function(data){
  var self = this;
  self.abbr = data.abbr;
  self.title = data.title;
  self.actor = data.actor; //an actor object
  self.sketch = data.sketch

  self.equals = function(obj){
    return (self.abbr == obj.abbr && self.actor == obj.actor);
  }
}

var Sketch = function(data){
  var self = this;
  self.key = ko.observable(data.title.replace(/[^a-z\-_]/ig,""));
  self.title = ko.observable(data.title);
  self.roles = ko.observableArray(data.roles);
  self.room = ko.observable(undefined);

  self.taken = ko.computed(function(){
    for(var i in self.roles()){
      var actor = self.roles()[i].actor;
      if(actor.sketches().length)
        return true;
    }
    return false;
  });

  self.inUse = ko.computed({
    read: function(){
      for(var i in self.roles()){
        var actor = self.roles()[i].actor;
        if(actor.sketches().indexOf(self.key()) > -1)
          return true;
      }
      return false;
    },
    write: function(value){
      for(var i in self.roles()){
        var actor = self.roles()[i].actor;
        if(value && !actor.disabled()){
          actor.addSketch(self.key());
        } else {
          actor.removeSketch(self.key());
        }
      }
    }
  });

  self.addRole = function(data){
    var role = self.getRole(data);
    if(role == undefined)
      self.roles().push(data);
    return role;
  }

  self.getRole = function(data){
    for(var i in self.roles()){
      if(data.abbr == self.roles()[i].abbr)
        return self.roles()[i];
      return undefined;
    }
  }

  self.inSketch = function(data){
    for(var i in self.roles()){
      if(self.roles()[i].actor.equals(data)){
        return true;
      }
    }
    return false;
  }

  self.actors = ko.computed(function(){
    retval = [];
    for(var i in self.roles()){
      var actor = self.roles()[i].actor;
     if(actor.sketches.indexOf(self.key))
       retval.push(actor);
    }
    return retval;
  });

  self.equals = function(obj){
    return (self.title == obj.title);
  }
}

var Act = function(data){
  self = this;
  self.title = ko.observable(data.title);
  self.sketches = ko.observableArray([]);
}

var Room = function(data){
  var self = this;
  self.name = data.name;
  self.sketch = ko.observable(data.sketch);
}

var Segment = function(data){
  var self = this;
  self.acts = ko.observableArray([]);
  self.actors = ko.observableArray([]);
  self.showConfig = ko.observable(false);
  self.start = ko.observable();
  self.end = ko.observable();
  self.time = ko.computed(function(){
    return self.start() + " - " + self.end();
  });

  self.rooms = ko.observableArray([]);
  for(var i in data.rooms){
    var room = data.rooms[i];
    self.rooms.push(new Room({name:room.name,sketch: undefined}));
  }
  
  self.sessions = ko.computed(function(){
    retval = [];
    for(var i in self.rooms()){
      var room = self.rooms()[i];
      if(room.sketch() == undefined){
        for(var j in self.acts()){
          var act = self.acts()[j];
          for(var k in act.sketches()){
            var sketch = act.sketches()[k];
            if(sketch.inUse() && sketch.room() == undefined){
              sketch.room(room);
              room.sketch(sketch);
              break;
            }
          }
        }
        if(room.sketch() == undefined){
          room.sketch(null);
        }
      }
      retval.push(room);
    }
    return retval;
  });

  self.toggleConfig = function(){
    if(self.showConfig())
      self.showConfig(false);
    else
      self.showConfig(true);
  }

  self.freeActors = ko.computed(function(){
    var retval = [];
    for(var i in self.actors()){
      var actor = self.actors()[i];
      if(actor.sketches().length == 0){
        retval.push(actor);
      }
    }
    return retval;
  });

  self.sketches = ko.computed(function(){
    var sketches = "";
    for(var i in self.acts()){
      var act = self.acts()[i];
      for(var j in act.sketches()){
        var sketch = act.sketches()[j];
        if(sketch.inUse()){
          sketches += sketch.title() + ", ";
        }
      }
    }
    return sketches;
  });

  self.addActor = function(data){
    var actor = self.getActor(data);
    if(actor == undefined){
      var actor = new Actor(data);
      self.actors.push(actor);
    }
    return self.getActor(actor);
  }

  self.getActor = function(data){
    var actors = self.actors();
    for(var i in actors){
      if(actors[i].id == data.id){
        return actors[i];
      }
    }
    return undefined;
  }

  self.init = function(data){
    //Work through the data and collect all actors
    for(var i in data.acts){
      var act = data.acts[i];

      var actObj = new Act(act);
      self.acts.push(actObj);

      for(var j in act.materials){
        var sketch = act.materials[j];
        var roles = [];
        for(var k in sketch.roles){
          var role = sketch.roles[k];
          var roleObj = new Role(role);
          var actor = self.addActor({id: role.actor.toLowerCase(), name: role.actor});
          roleObj.actor = actor;
          roles.push(roleObj);
          actor.addRole(roleObj);
        }
        var sketchObj = new Sketch({'title':sketch.title,'roles':roles});
        actObj.sketches.push(sketchObj);
      }
    }

    self.actors.sort(function(left,right){
      return left.name() == right.name() ? 0 : (left.name() <
      right.name() ? -1 : 1);
    });
  }
  /* Event handlers for the room plan */
  self._srcElement = undefined;

  self.startdragHandler = function(data, event){
    self._srcElement = data;
    return true;
  }

  self.dragoverHandler = function(data, event){
    event.preventDefault();
  }

  self.dropHandler = function(data, event){
    if(self._srcElement != undefined){
      var tmp = data == null ? null : data.sketch();
      data.sketch(self._srcElement.sketch());
      self._srcElement.sketch(tmp);
      self._srcElement = undefined;
    }
  }
}

var RevueViewModel = function(){
  var self = this;
 
  //this should be fixed
  self.currentSegment = ko.observable(new Segment({rooms:[]}));
  self.currentSegmentId = null;
  self.segments = ko.observableArray([]);
  self.views = ko.observableArray([
    {name:'Roles', menu: []},
    {name:'Rooms', menu: []}
  ]);
  self.rooms = ['Lille UP1',
  '1-0-37',
  '1-0-34',
  '1-0-30',
  '1-0-26',
  'Harlem'];
  self.activeView = ko.observable(self.views()[0]);

  self.chooseView = function(data){
    self.activeView(data);
  }

  /**
   * Creates a new segment, might not be needed
   */
  self.newSegment = function(){
    self.currentSegmentId = null;
    var segment = new Segment({rooms:self.rooms});
    segment.init(self.data);
    self.currentSegment(segment);
  }

  /**
   * Clears all data in the current segment
   */
  self.clearSegment = function(){
    self.newSegment();
  }

  /**
   * Adds the segment to the list of segments
   */
  self.addSegment = function(){
    if(self.currentSegment().start() == undefined|| self.currentSegment().end() ==
      undefined){
      alert('Please supply start and end time for the segment before adding');
      return;
    }
    self.segments.push(self.currentSegment());
    self.segments.sort(function(left,right){
      return left.start == right.start ? 0 : (left.start < right.start ?
      -1 : 1);
    });
    self.newSegment();
  }

  self.addPause = function(){
    //show a message dialog asking for start and endtime.
    //Then add an empty segment, also with no actors in it
  }
  /**
   * Load a saved segment
   */
  self.loadSegment = function(data){
    self.currentSegment(data);  
  }

  /**
   * Removes a segment from the list of segments
   */
  self.removeSegment = function(data){
    self.segments.remove(data);
  }

  self.removeAll = function(data){
    self.segments([]);
  }

  $.getJSON('../json.js',function(data){
    self.data = data;
    self.newSegment(data);
  });
}
var model = new RevueViewModel();
ko.applyBindings(model);

