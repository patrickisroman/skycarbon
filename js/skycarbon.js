var current_data_url = 'https://cors-anywhere.herokuapp.com/http://flightaware.com/live/aircrafttype/';
var emission_map_url = 'emission_map.json';
var carbon_emission_map = {};
var element = document.getElementById("lessInfoObj");

var test_data = {'a' : 5102, 'b' : 516};
var test_map = JSON.parse(
    '{\
        "Boeing 737-800" : {\
            "kg_per_sec" : 3.31912499984\
        },\
        "Airbus A320" : {\
            "kg_per_sec" : 3.31912499984\
        },\
        "Airbus A321" : {\
            "kg_per_sec" : 3.31912499984\
        },\
        "default" : {\
            "kg_per_sec" : 3.31912499984\
        }\
    }'
);

var skyDiv = document.getElementById("sky");

function R(min,max) {
    return min+Math.random()*(max-min)
};
var w = window.innerWidth;
var h = window.innerHeight;

for (i=0; i<50; i++) {
    var div = document.createElement('div');
    var cloud_data = generate_cloud_data();
    $(div).css('z-index', Math.round(205 - cloud_data[0]));
    div.setAttribute('speed', cloud_data[5]);

    TweenMax.set(div, {
        attr:{class:'cloudy'},
        x:w+R(100, w),
        y:cloud_data[1],
        scale:cloud_data[2],
        opacity:cloud_data[4],
        rotationY: R(0, 10) > 5 ? 180 : 0
    });
    skyDiv.appendChild(div);
    animm(div);
}

var div = document.createElement('div');
TweenMax.set(div, {
    attr: {class:'airplane'},
    y: 0,
    rotation:1,
    scale: 2.3,
    transformOrigin: '50% 50%'
});
plane_anim(div);
skyDiv.appendChild(div);

function generate_cloud_data() {
    var max_distance = 200;

    var distance = R(0, max_distance);
    var y = h - (250 + (2 * distance));
    var scale = 2 - (1.5*(distance / max_distance));
    var animation_dur = scale;
    var opacity = 1 - (.25 * (distance/max_distance));
    var speed = 5 + (5 * Math.pow(distance / (max_distance / 2), 1.75))
    return [distance, y, scale, animation_dur, opacity, speed];
}

function plane_anim(el) {
    TweenMax.to(el, 4, {
        rotation:-1,
        y:'-=60',
        repeat: -1,
        yoyo: true,
        ease:Sine.easeInOut,
        transformOrigin: '50% 50%'
    });
}

function animm(el) {
    TweenMax.to(el, el.getAttribute('speed'),{
        x:-300,
        rotation:1,
        repeat: -1,
        yoyo:false,
        ease:Linear.easeNone,
        onComplete: function() {
            console.log(el.getAttribute('speed'));
            this.repeat();
        }
    });
}

var stepped_emissions_tonnes = 0;
var total_emissions_kg = 0;
var last_loaded_timestamp = 0;
var last_balloon_update_timestamp = 0;

var jitter_enabled = true;
var data_refresh_rate_sec = .05; // 100 ms
var data_refresh_jitter_sec = .05; // +/i 50 ms

// how should we draw stoof?
var tonnes_per_puff = 1;
var tonnes_per_balloon = 50;

var balloon_array = new Array();
var display_mode = 'balloon';

var start_time = window.performance.now() / 1000;
var carbon_kg_absorption_per_year = 18;
var trees_to_offset_kg = (365 / carbon_kg_absorption_per_year);

// list of our global aircraft
var global_aircraft_tracker = new Array();
var total_flights = 0

function load_current_flight_data() {
    $.ajax({
        url: current_data_url,
        type: "get",
        dataType:'text',
        success: function(response) {
            console.log('Relisted');
            var html = $.parseHTML(response);
            var result = $(html).find(".prettyTable");
            var response_arr = new Array();
            var flights = 0;
            $(result).find("tr").each(function(e, el) {
                var entries = $(el).find('td');
                var aircraft_num = parseInt($(entries[0]).text());
                var aircraft_type = $(entries[2]).text();

                if (aircraft_type.trim() && aircraft_num > 0) {
                    flights += aircraft_num;
                    response_arr.push({aircraft: aircraft_type, num: aircraft_num});
                }
            });
            
            total_flights = flights;
            global_aircraft_tracker = response_arr.slice();
            $("#airborneFlights").html(`${total_flights.toLocaleString()} <b><br/>airborne flights</b>`);
            $("#livePlanes").text(`${total_flights.toLocaleString()}`);
            var update_time = new Date().toLocaleString();
            $("#livePlanes").attr('title', `Live Airborne Aircrafts 
            Updated: ${update_time}`).tooltip('_fixTitle');
        }
    });
}

class cloud {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }
}

$("#aboutButton").on('click', function() {
    $("#exampleModal").modal();
});

$("#moreInfo").on('click', function(e) {
EPPZScrollTo.scrollTo(window.outerHeight);
});

$("#lessInfo").on('click', function(e) {
    EPPZScrollTo.scrollTo(0);
});


load_current_flight_data();
setInterval(load_current_flight_data, 30000);

function random_in_range(min, max, round=true) {
    var result = min + (Math.random() * (max - min));
    return round ? Math.round(result) : result;
}

function push_new_balloon() {
    var balloon_y_min = .9 * window.outerHeight ;
    var balloon_speed = random_in_range(100, 250);

    balloon_pos = [
        Math.round(random_in_range(0, window.outerWidth)),
        Math.round(random_in_range(balloon_y_min, (1.2 * window.outerHeight)))
    ];

    var balloon_div = document.createElement('div');
    balloon_div.setAttribute('class', 'balloon');
    balloon_div.style.left = balloon_pos[0];
    balloon_div.style.top = balloon_pos[1];
    balloon_div.setAttribute('speed', `${balloon_speed}`);

    document.getElementById('pageBackground').appendChild(balloon_div);
    balloon_array.push(balloon_div);
}

function iterate_all_balloons() {
    var current_timestamp = window.performance.now() / 1000;

    if (!last_balloon_update_timestamp) {
        last_balloon_update_timestamp = current_timestamp;
        return;
    }

    var time_elapsed_sec = current_timestamp - last_balloon_update_timestamp;

    balloon_array.forEach(balloon => {
        var speed = balloon.getAttribute('speed');
        var current_top = balloon.style.top.replace('px', '');
        balloon.style.top = current_top - (speed * time_elapsed_sec);
    });

    last_balloon_update_timestamp = current_timestamp;
}

function push_carbon_calculation(emissions_kg, time) {
    total_emissions_kg += emissions_kg;
    var rounded_kg = Math.round(total_emissions_kg);

    var carbon_per_day = Math.round((86400 / (time - start_time)) * rounded_kg);
    $("#co2PerDay").html(`${carbon_per_day.toLocaleString()} <b><br/>kg</b>`);

    var carbon_per_hour = Math.round((3600 / (time - start_time)) * rounded_kg);
    $("#co2PerHour").html(`${carbon_per_hour.toLocaleString()} <b><br/>kg</b>`)

    var carbon_per_minute = Math.round(carbon_per_hour / 60);
    $("#co2PerMinute").html(`${carbon_per_minute.toLocaleString()} <b><br/>kg</b>`);

    var carbon_per_second = Math.round(carbon_per_minute / 60);
    $("#co2PerSecond").html(`${carbon_per_second.toLocaleString()} <b><br/>kg</b>`);

    var trees_to_offset = Math.round(total_emissions_kg * trees_to_offset_kg);
    $("#treesToOffset").html(`${trees_to_offset.toLocaleString()} <b><br/>trees</b>`);

    var volume_output = 511 * total_emissions_kg;
    var balloons_to_offset = Math.round(volume_output / 2500000);
    $("#balloonsToOffset").html(`${balloons_to_offset.toLocaleString()} <b><br/>balloons</b>`)

    var x = rounded_kg.toLocaleString();
    $("#carbonkG").text(`${x} kg`);

    $("#totalCarbon").html(`${x} <b><br/>kg</b>`);
}

$("#displayVersion").change(function() {
    display_mode = this.checked ? 'airplane' : 'balloon';
    toggle_mode(this.checked);
});

function toggle_mode(is_airplane) {
    if (is_airplane) {
        console.log('not supported');
        while (balloon_array.length > 0) {
            balloon_array.pop();
        }
        var background = document.getElementById('pageBackground');
        while (background.hasChildNodes) {
            background.removeChild(background.firstChild);
        }
    } else {

    }
}

function calculate_carbon_emissions(aircraft_data, reference_map, time_elapsed_sec) {
    var total_carbon = 0;

    var num = 0;
    for (let i = 0; i < aircraft_data.length; i++) {
        var aircraft_type = aircraft_data[i]['aircraft'].trim();
        var aircraft_num = aircraft_data[i]['num'];

        num += aircraft_num;
        carbon_rate = reference_map[aircraft_type] ? reference_map[aircraft_type]['kg_per_sec'] : reference_map['default']['kg_per_sec'];
        total_carbon += (aircraft_num * carbon_rate * time_elapsed_sec);
    }

    return Math.round(total_carbon);
}

function step_total_carbon_emissions() {
    var current_timestamp = window.performance.now() / 1000;

    if (!last_loaded_timestamp) {
        last_loaded_timestamp = current_timestamp;
        return;
    }

    var time_elapsed_sec = current_timestamp - last_loaded_timestamp;
    var local_carbon_calculation = calculate_carbon_emissions(global_aircraft_tracker, test_map, time_elapsed_sec);
    last_loaded_timestamp = current_timestamp;

    push_carbon_calculation(local_carbon_calculation, current_timestamp);

    var refresh_interval = jitter_enabled 
        ? data_refresh_rate_sec + ((Math.random() * data_refresh_jitter_sec * 2) - data_refresh_jitter_sec)
        : data_refresh_rate_sec;
}

setInterval(step_total_carbon_emissions, 75);


/**
 *
 * Created by Borbás Geri on 12/17/13
 * Copyright (c) 2013 eppz! development, LLC.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */


var EPPZScrollTo =
{
    /**
     * Helpers.
     */
    documentVerticalScrollPosition: function()
    {
        if (self.pageYOffset) return self.pageYOffset; // Firefox, Chrome, Opera, Safari.
        if (document.documentElement && document.documentElement.scrollTop) return document.documentElement.scrollTop; // Internet Explorer 6 (standards mode).
        if (document.body.scrollTop) return document.body.scrollTop; // Internet Explorer 6, 7 and 8.
        return 0; // None of the above.
    },

    viewportHeight: function()
    { return (document.compatMode === "CSS1Compat") ? document.documentElement.clientHeight : document.body.clientHeight; },

    documentHeight: function()
    { return (document.height !== undefined) ? document.height : document.body.offsetHeight; },

    documentMaximumScrollPosition: function()
    { return this.documentHeight() - this.viewportHeight(); },

    elementVerticalClientPositionById: function(id)
    {
        var element = document.getElementById(id);
        var rectangle = element.getBoundingClientRect();
        console.log(rectangle.top)
        return rectangle.top;
    },

    /**
     * Animation tick.
     */
    scrollVerticalTickToPosition: function(currentPosition, targetPosition)
    {
        var filter = 0.2;
        var fps = 60;
        var difference = parseFloat(targetPosition) - parseFloat(currentPosition);

        // Snap, then stop if arrived.
        var arrived = (Math.abs(difference) <= 0.5);
        if (arrived)
        {
            // Apply target.
            scrollTo(0.0, targetPosition);
            return;
        }

        // Filtered position.
        currentPosition = (parseFloat(currentPosition) * (1.0 - filter)) + (parseFloat(targetPosition) * filter);

        // Apply target.
        scrollTo(0.0, Math.round(currentPosition));

        // Schedule next tick.
        setTimeout("EPPZScrollTo.scrollVerticalTickToPosition("+currentPosition+", "+targetPosition+")", (1000 / fps));
    },

    scrollTo: function(targetPosition) {
        this.scrollVerticalTickToPosition(this.documentVerticalScrollPosition(), targetPosition)
    },

    /**
     * For public use.
     *
     * @param id The id of the element to scroll to.
     * @param padding Top padding to apply above element.
     */
    scrollVerticalToElementById: function(id, padding)
    {
        var element = document.getElementById(id);
        if (element == null)
        {
            console.warn('Cannot find element with id \''+id+'\'.');
            return;
        }

        var targetPosition = this.documentVerticalScrollPosition() + this.elementVerticalClientPositionById(id) - padding;
        var currentPosition = this.documentVerticalScrollPosition();

        // Clamp.
        var maximumScrollPosition = this.documentMaximumScrollPosition();
        if (targetPosition > maximumScrollPosition) targetPosition = maximumScrollPosition;

        // Start animation.
        this.scrollVerticalTickToPosition(currentPosition, targetPosition + window.outerHeight);
    }
};