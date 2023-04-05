(function(factory) {
  //namespacing
  if(!window["Compare"]) {
    window["Compare"] = {} ;
  }
  factory(window["Compare"]) ;
})(function(Compare) { //namespace Compare

  /*** Global comparator ***/

  /* setup all elements of class compare */
  function setup_comparators() {
    var comparators = document.querySelectorAll(".compare") ;
    for(var comparator of comparators) {
      var videos = [...comparator.querySelectorAll("video")] ;
      wait_for_videos(videos, comparator, setup_comparator) ;
    }
  }

  /* wait for video metadata to be ready so that their size is known */
  function wait_for_videos(videos, comparator, action) {
    //ensure that every video is handled
    if(videos.length > 0) {
      if(videos[0].readyState < 1) {
        //the video is still not available, add hook
        videos[0].addEventListener("loadedmetadata", function(e) {
          wait_for_videos(videos.slice(1), comparator, action) ;
        }) ;
      } else {
        //the video is ready, proceed to the remaining ones
        wait_for_videos(videos.slice(1), comparator, action) ;
      }
      //manual autoplay
      if(videos[0].readyState < 4) {
        //not enough data is available, add a play trigger when available
        videos[0].addEventListener("canplay", function(e) {
          e.currentTarget.play() ;
        }) ;
      } else {
        //sufficient data is available, play
        videos[0].play() ;
      }
    } else {
      //all videos are ready, proceed to setup
      action(comparator) ;
    }
  }

  /* setup a comparator element */
  function setup_comparator(comparator) {
    //get compared element
    var compared = comparator.querySelectorAll(".compared") ;
    if(compared.length == 0) {
      console.error("comparator contains no compared element") ;
      return ;
    }

    //size
    var w = compared[0].clientWidth ;
    var h = compared[0].clientHeight ;

    //comparator style
    var sources = [] ;
    if(compared.length == 1) {
      //a single compared element, has to be vertical or horizontal
      if(compared[0].classList.contains("compared-vertical")) {
        //single image or video horizontally split
        h = h / 2 ;
        sources.push({
          elt : compared[0],
          label : compared[0].dataset.compareTop,
          x : 0,
          y : 0
        }) ;
        sources.push({
          elt : compared[0],
          label : compared[0].dataset.compareBottom,
          x : 0,
          y : h
        }) ;
      } else if(compared[0].classList.contains("compared-horizontal")) {
        //single image or video vertically split
        w = w / 2 ;
        sources.push({
          elt : compared[0],
          label : compared[0].dataset.compareLeft,
          x : 0,
          y : 0
        }) ;
        sources.push({
          elt : compared[0],
          label : compared[0].dataset.compareRight,
          x : w,
          y : 0
        }) ;
      } else {
        console.error("unable to compare a single element without compared-vertical or compared-horizontal") ;
        return ;
      }
    } else if(compared.length == 2) {
      //two compared elements, one should be left, the other one right
      var left = comparator.querySelector(".compared-left") ;
      var right = comparator.querySelector(".compared-right") ;
      if(left && right) {
        sources.push({
          elt : left,
          label : left.dataset.compare,
          x : 0,
          y : 0
        }) ;
        sources.push({
          elt : right,
          label : right.dataset.compare,
          x : 0,
          y : 0
        }) ;
      } else {
        console.error("comparator must contain a compared-left and a compared-right child") ;
        return ;
      }
    } else {
      console.error("comparison not handled for more than two elements") ;
      return ;
    }

    //Setup the div width according to the content
    comparator.style.width = w + "px" ;

    //setup visible canvas
    var canvas = document.createElement("canvas") ;
    comparator.appendChild(canvas) ;
    canvas.width = w ;
    canvas.height = h ;

    //setup context
    var context = {
      canvas : canvas,
      sources : sources,
      x : w/2, 
      y : h/2, 
      speed : 1,
      orientation : 0
    } ;

    //setup settings
    create_settings(comparator, context) ;

    //move split with the mouse
    comparator.addEventListener("mousemove", function(e) {
      //mouse position relative to the canvas
      var rect = context.canvas.getBoundingClientRect() ;
      var x = e.clientX - rect.x ;
      var y = e.clientY - rect.y ;

      if(x < 0 || x > context.canvas.width || y < 0 || y > context.canvas.height) {
        //the mouse is out of the canvas
      } else {
        // the mouse in is the canvas, update split position
        setTimeout(move_split, 0, context, x, y) ;
      }
    })

    //splatting
    if(sources[0].elt.nodeName == "VIDEO" || sources[1].elt.nodeName == "VIDEO") {
      //for videos schedule regular splatting
      setInterval(transfer_compare, 40, context) ;
    } else {
      //for images splat once, update handled by mouseover
      setTimeout(transfer_compare, 0, context) ;
    }
  }

  /* move the split to a given relative position */
  function move_split(context, x, y) {
    //position relative to the canvas
    context.x = x ;
    context.y = y ;

    //request redraw
    setTimeout(transfer_compare, 0, context) ;
  }

  /* splatting on the canvas */
  function transfer_compare(context) {
    //context information
    var ctx = context.canvas.getContext("2d") ;
    var w = context.canvas.width ;
    var h = context.canvas.height ;
    var s = context.sources ;

    //splat first image on the whole canvas
    ctx.drawImage(s[0].elt, s[0].x, s[0].y, w, h, 0, 0, w, h) ;

    //separator color
    ctx.strokeStyle = "#FF0000" ;

    //splat the second image
    if(context.orientation % 2 == 0) {
      //vertical split position
      var x = Math.min(Math.max(1, context.x), w-1) ;

      //split sides
      if(context.orientation == 0) {
        //other image on the right
        ctx.drawImage(s[1].elt, s[1].x + x, s[1].y, w - x, h, x, 0, w - x, h) ;
      } else {
        //other image on the left
        ctx.drawImage(s[1].elt, s[1].x, s[1].y, x, h, 0, 0, x, h) ;
      }

      //separator
      ctx.beginPath() ;
      ctx.moveTo(x, 0) ;
      ctx.lineTo(x, h) ;
      ctx.stroke() ;
    } else {
      //horizontal split position
      var y = Math.min(Math.max(1, context.y), h-1) ;

      //split sides
      if(context.orientation == 1) {
        //other image on top
        ctx.drawImage(s[1].elt, s[1].x, s[1].y, w, y, 0, 0, w, y) ;
      } else {
        //other image below
        ctx.drawImage(s[1].elt, s[1].x , s[1].y + y, w, h - y, 0, y, w, h - y) ;
      }

      //separator
      ctx.beginPath() ;
      ctx.moveTo(0, y) ;
      ctx.lineTo(w, y) ;
      ctx.stroke() ;
    }
  }

  /*** Magnifiers ***/

  /*** Settings ***/

  /* slider creation helper */
  function create_slider(name, context, context_target, min, max, step) {
    //container for everything
    var container = document.createElement("div") ;
    container.className = "compare-setting" ;

    //slider
    var input = document.createElement("input") ;
    input.type = "range" ;
    input.min = min ;
    input.max = max ;
    if(step) {
      input.step = step ;
    }
    input.value = context[context_target] ;

    //frame around the slider
    var frame = document.createElement("div") ;
    frame.className = "range-container" ;
    
    //slider name
    var label = document.createElement("label") ;
    label.innerHTML = name ;
    
    //slider value
    var value = document.createElement("label") ;
    value.innerHTML = input.value ;

    //put everything together
    container.appendChild(label) ;
    frame.appendChild(input) ;
    container.appendChild(frame) ;
    container.appendChild(value) ;

    //update the value label and the context variable
    input.addEventListener("change", function(e) {
      var v = e.currentTarget.value ;
      value.innerHTML = v ;
      context[context_target] = v ;
    }) ;

    return container ;
  }

  function create_play_toggle(context) {
    //container
    var container = document.createElement("div") ;
    container.className = "compare-setting" ;

    //play / pause
    var icon = document.createElement("div") ;
    icon.className = "pause" ;
    var videos = context.sources.map(c => c.elt).filter(e => e.nodeName == "VIDEO") ;
    icon.addEventListener("click", function() {
      if(icon.classList.contains("play")) {
        icon.classList.replace("play", "pause") ;
        videos.forEach(v => v.play()) ;
      } else {
        icon.classList.replace("pause", "play") ;
        videos.forEach(v => v.pause()) ;
      }
    }) ;

    container.appendChild(icon) ;
    return container ;
  }

  /* add settings bar to the DOM */
  function create_settings(elt, context) {
    //settings bar
    var settings = document.createElement("div") ;
    settings.className = "compare-settings" ;
    elt.appendChild(settings) ;

    //video specific settings
    var c0 = context.sources[0].elt ;
    var c1 = context.sources[1].elt ;
    if(c0.nodeName == "VIDEO" || c1.nodeName == "VIDEO") {
      //play pause
      var playpause = create_play_toggle(context) ;
      settings.appendChild(playpause) ;

      //video speed slider
      var speed = create_slider("Speed", context, "speed", 0, 1, 0.1)
      var slider = speed.querySelector("input")
      //update video playback speed on slider change
      slider.addEventListener("change", function(e) {
        if(c0.nodeName == "VIDEO") {
          c0.playbackRate = e.currentTarget.value ;
        }
        if(c1.nodeName == "VIDEO") {
          c1.playbackRate = e.currentTarget.value ;
        }
      }) ;
      settings.appendChild(speed) ;
    }
  }

  /*** trigger ***/

  window.addEventListener("load", setup_comparators) ;
})
