var canvas = document.getElementById('skyCarbonCanvas');
var ctx = canvas.getContext('2d');

var current_data_url = 'load_json.json';
var emission_map_url = 'emission_map.json';
var carbon_emission_map = {};

var test_data = {'a' : 5102, 'b' : 516};
var test_map = {'a' : 5, 'b' : 3};

var stepped_emissions_tonnes = 0;
var total_emissions_tonnes = 0;
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

function load_current_flight_data() {
    /*
    $.ajax({
        url: current_data_url,
        success: function(message) {
            console.log(message);
        }
    });
    */
}

function load_map_data() {
    /*
    $.ajax({
        url: emission_map_url,
        success: function(response) {
            try {
                carbon_emission_map = JSON.parse(response);
            } catch(e) {
                carbon_emission_map = null;
            }
        }
    });
    */
}

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

function push_carbon_calculation(emissions_tonnes) {
    total_emissions_tonnes += emissions_tonnes;
    var rounded_tonnes = Math.round(total_emissions_tonnes * 10) / 10;

    $("#carbonTonnage").text(`${rounded_tonnes} kg`);

    if (display_mode == 'balloon') {
        if (random_in_range(0, 10) > 8) {
            push_new_balloon();
        }

        iterate_all_balloons();
    }
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

function step_total_carbon_emissions() {
    var current_timestamp = window.performance.now() / 1000;

    if (!last_loaded_timestamp) {
        last_loaded_timestamp = current_timestamp;
        return;
    }

    var time_elapsed_sec = current_timestamp - last_loaded_timestamp;

    // TODO : change this to real data from ajax :)
    var local_carbon_calculation = 0;
    for (key in test_data) {
        if (!test_data[key] || !test_map[key]) {
            continue;
        }

        local_carbon_calculation += test_data[key] * ((test_map[key] / 60) * time_elapsed_sec);
    }

    last_loaded_timestamp = current_timestamp;

    push_carbon_calculation(local_carbon_calculation);

    var refresh_interval = jitter_enabled 
        ? data_refresh_rate_sec + ((Math.random() * data_refresh_jitter_sec * 2) - data_refresh_jitter_sec)
        : data_refresh_rate_sec;
}

load_map_data();

//setInterval(load_current_flight_data, 5000);
//setInterval(step_total_carbon_emissions, data_refresh_rate_sec * 1000);