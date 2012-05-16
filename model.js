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
      if(data.abbr == self.roles()[i].abbr)
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

  self.equals = function(obj){
    return (self.title == obj.title);
  }
}

var Act = function(data){
  self = this;
  self.title = ko.observable(data.title);
  self.sketches = ko.observableArray([]);
}

var Segment = function(data){
  var self = this;
  self.acts = ko.observableArray([]);
  self.actors = ko.observableArray([]);
  self.segments = ko.observableArray([]);
  self.showConfig = ko.observable(false);
  self.start = ko.observable();
  self.end = ko.observable();
  self.time = ko.computed(function(){
    return self.start() + " - " + self.end();
  });

  self.toggleConfig = function(){
    if(self.showConfig())
      self.showConfig(false);
    else
      self.showConfig(true);
  }

  self.sketches = ko.computed(function(){
    var sketches = "";
    for(var i in self.acts()){
      var act = self.acts()[i];
      for(var j in act.sketches()){
        var sketch = act.sketches()[j];
        if(sketch.inUse()){
          sketches += sketch.title() + ",";
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

  $.getJSON('json.js',function(data){
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
          var actor = self.addActor({id: role.actor.toLowerCase(), name: role.actor});
          role.actor = actor;
          //ok, so we know that the actor exists nowa
          var roleObj = new Role(role);
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
  });
}

var RevueViewModel = function(){
  var self = this;
 
  self.currentSegment = ko.observable(new Segment());
  self.currentSegmentId = null;
  self.segments = ko.observableArray([]);
  self.views = ko.observableArray([
    {name:'Actor', menu: []},
    {name:'Rooms', menu: []}
  ]);
  self.activeView = ko.observable(self.views()[0]);

  self.chooseView = function(data){
    self.activeView(data);
  }

  /**
   * Creates a new segment, might not be needed
   */
  self.newSegment = function(){
    self.currentSegmentId = null;
    self.currentSegment(new Segment());
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
    self.segments.remove(data);
    self.currentSegment(data);  
  }

  /**
   * Removes a segment from the list of segments
   */
  self.removeSegment = function(data){
    self.segments.remove(data);
  }
}
var model = new RevueViewModel();
ko.applyBindings(model);

