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

 
/*  self._something = [];
  self.sketches = ko.observableArray([]);ko.computed({
    read: function(){
      return self._something;
    },
    write: function(value){
      self._something.push(value);
    },
    push: function(value){
      alert('wtf');
    }
  });
*/
/*  self.addSketch = function(data){
  }

  self.getSketch = function(data){
    for(var i in self.sketches){
      if(self.sketches[i].equals(data)){
        return true;
      }
    }
    return false;
  }
*/
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
/*  self.inUse = ko.computed({
    'read': function(){
      return self.actor.sketches().indexOf(self.sketch.key()) > -1;
    },
    'write': function(value){
      if(value){
        self.actor.sketches().push(self.sketch.key());
      } else {
        self.actor.sketches().remove(function(item){
          item == self.sketch.key();
        });
      }
    }
  });
  */ 
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
/*
ko.bindingHandlers.selectSketch = {
  'update': function(element, valueAccessor, allBindingsAccessor) {
    var observer = valueAccessor(), allBindings = allBindingsAccessor();
    var value = ko.utils.unwrapObservable(value);
    
    var sketch = allBindings.sketch;
    
    if(value){
      //check all checkboxes

    } else {
      //uncheck all checkboxes
    }
  }
}

ko.bindingHandlers.selectActor = {
  'update': function(element, valueAccessor, allBindingsAccessor){

  }
}
*/
var Act = function(data){
  self = this;
  self.title = ko.observable(data.title);
  self.sketches = ko.observableArray([]);
}

var Segment = function(data){
  self = this;
  self.actors = data.actors
}

var RevueViewModel = function(){
  var self = this;
  self.acts = ko.observableArray([]);
//  self.sketches = ko.observableArray([]);
  self.actors = ko.observableArray([]);
  self.segments = ko.observableArray([]);
  self.curSegment = self.segments().length;
   
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

  /**
   * Creates a new segment, might not be needed
   */
  self.newSegment = function(){
  }

  /**
   * Clears all data in the current segment
   */
  self.clearSegment = function(){
    for(var i in self.actors){
      self.actors.sketches = ko.observableArray([]);
    }
  }

  /**
   * Adds the segment to the list of segments
   */
  self.saveSegment = function(){
    var segmentObj = new Segment({actors: self.actors});
    self.segments.push(segmentObj);
  }

  /**
   * Load a saved segment
   */
  self.loadSegment = function(index){
    var segment = self.segments()[index];
    if(segment != undefined){
      self.curSegment = index;
      self.actors = segment.actors;
    }
  }

  /**
   * Removes a segment from the list of segments
   */
  self.removeSegment = function(index){
    if(self.segments()[index] != undefined){
      self.segments.splice(index,1);
    }
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

var model = new RevueViewModel();
ko.applyBindings(model);

