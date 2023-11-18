(function( $ ) {

    $.ec = {
        reals: {},
        modk: {},
    };

    var colors = {
        red: "#cb4b4b",
        yellow: "#edc240",
        blue: "#afd8f8",
    };

    /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cbrt#Polyfill */
    Math.cbrt = Math.cbrt || function(x) {
        var y = Math.pow(Math.abs(x), 1 / 3);
        return x < 0 ? -y : y;
    };

    var sortUnique = function( arr ) {
        // Sorts an array of numbers and removes duplicate elements in place.

        arr.sort(function( a, b ) {
            return a - b;
        });

        for( var i = 1; i < arr.length; i += 1 ) {
            if( arr[ i ] === arr[ i - 1 ] ) {
                arr.splice( i, 1 );
                i -= 1;
            }
        }
        return arr;
    };

    var round10 = function( value, exp ) {
        // This code has been copied and adapted from the MDN:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round.

        if( typeof exp === "undefined" ) {
            exp = -5;
        }

        // If the exp is undefined or zero...
        if ( +exp === 0 ) {
            return Math.round( value );
        }

        value = +value;
        exp = +exp;

        // If the value is not a number or the exp is not an integer...
        if ( isNaN( value ) || typeof exp !== "number" || exp % 1 !== 0 ) {
          return NaN;
        }

        // Left shift.
        value = value.toString().split( "e" );
        value = Math.round( +( value[ 0 ] + "e" +
                            ( value[ 1 ] ? ( +value[ 1 ] - exp ) : -exp ) ) );

        // Shift back.
        value = value.toString().split( "e" );
        return +( value[0] + "e" +
                  ( value[ 1 ] ? ( +value[ 1 ] + exp ) : exp ) );
    };

    var setInputValuesFromHash = function() {
        var hash = window.location.search;

        if( hash[ 0 ] === "?" ) {
            hash = hash.substr( 1 );
        }

        var items = hash.split( "&" );

        for( var i = 0; i < items.length; i += 1 ) {
            var item = items[ i ].split( "=" );
            var name = item[ 0 ];
            var value = item[ 1 ];

            if( item.length !== 2 ||
                !name ||
                !value ||
                /[^a-z]/.test( name ) ||
                /[^-.0-9]/.test( value ) ) {
                continue;
            }

            $( "input[name='" + name + "']" ).val( value );
        }
    };

    var isPrime = function( n ) {
        n = +n;

        if( n < 2 || n % 2 === 0 ) {
            return n === 2;
        }

        for( var m = 3; m < n; m += 2 ) {
            if( n % m === 0 ) {
                return false;
            }
        }

        return true;
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.Base

    $.ec.Base = function() {
        setInputValuesFromHash();

        this.aInput = $( "input[name='a']" );
        this.bInput = $( "input[name='b']" );
        this.plotContainer = $( "#plot" );
        this.equationContainer = $( ".curve-equation" );
        this.singularWarning = $( ".curve-singular-warning" );

        this.marginFactor = 1 / 8;

        this.plot = $.plot( this.plotContainer, {} );

        var curve = this;
        $().add( this.aInput )
           .add( this.bInput )
           .change(function() { curve.update(); });

        $(function() { curve.update(); });
    };

    $.ec.Base.prototype.hideGrid = function() {
        var axes = this.plot.getAxes();

        axes.xaxis.options.show = false;
        axes.yaxis.options.show = false;

        var grid = this.plot.getOptions().grid;

        grid.borderWidth = 0;
        grid.margin = { top: 0, left: 0, bottom: 0, right: 0 };
        grid.axisMargin = 0;
        grid.minBorderMargin = 0;
    };

    $.ec.Base.prototype.whiteBackground = function() {
        var grid = this.plot.getOptions().grid;
        grid.backgroundColor = "#ffffff";
    };

    $.ec.Base.prototype.getRoots = function( a, b ) {
        // Returns an array containing the coordinates of the points where the
        // curve intersects the x-axis. This means solving the equation:
        //
        //     x^3 + ax + b = 0
        //
        // This function uses a simplified variant of the method for cubic
        // functions:
        // http://en.wikipedia.org/wiki/Cubic_function#Roots_of_a_cubic_function

        if( typeof a === "undefined" ) {
            a = this.a;
        }
        if( typeof b === "undefined" ) {
            b = this.b;
        }

        var roots;
        var q = a / 3;
        var r = -b / 2;
        var delta = q * q * q + r * r;

        if( delta > 0 ) {
            var s = Math.cbrt( r + Math.sqrt( delta ) );
            var t = Math.cbrt( r - Math.sqrt( delta ) );
            roots = [ s + t ];
        }
        else if( delta < 0 ) {
            var s = Math.acos( r / Math.sqrt( -q * q * q ) );
            var t = 2 * Math.sqrt( -q );
            roots = [
                t * Math.cos( s / 3 ),
                t * Math.cos( ( s + 2 * Math.PI ) / 3 ),
                t * Math.cos( ( s + 4 * Math.PI ) / 3 )
            ]
        }
        else {
          roots = [
              2 * Math.cbrt( r ),
              Math.cbrt( -r )
          ]
        }

        return sortUnique( roots );
    };

    $.ec.Base.prototype.addPoints = function( p0, p1 ) {
        throw new Error( "must override" );
    };

    $.ec.Base.prototype.negPoint = function( p ) {
        throw new Error( "must override" );
    };

    $.ec.Base.prototype.mulPoint = function( n, p ) {
        // Returns the result of n * P = P + P + ... (n times).

        if( n === 0 || p === null ) {
            return null;
        }


        if( n < 0 ) {
            n = -n;
            p = this.negPoint( p );
        }

        var q = null;

        while( n ) {
            if( n & 1 ) {
                q = this.addPoints( p, q );
            }

            p = this.addPoints( p, p );
            n >>= 1;
        }

        return q;
    };

    $.ec.Base.prototype.getPlotRange = function( points ) {
        // Finds a range for the x-axis and the y-axis. This range shows all
        // the given points.

        if( typeof points === "undefined" ) {
            points = [];
        }

        var xMin = Infinity;
        var xMax = -Infinity;
        var yMin = Infinity;
        var yMax = -Infinity;

        for( var i = 0; i < points.length; i += 1 ) {
            var p = points[ i ];
            if( p === null ) {
                continue;
            }
            xMin = Math.min( xMin, p[ 0 ] );
            xMax = Math.max( xMax, p[ 0 ] );
            yMin = Math.min( yMin, p[ 1 ] );
            yMax = Math.max( yMax, p[ 1 ] );
        }

        if( this.marginFactor ) {
            // Add some margin for better display.
            var xMargin = this.marginFactor * ( xMax - xMin );
            var yMargin = this.marginFactor * ( yMax - yMin );

            // Adjust proportions so that x:y = 1.
            if( xMargin > yMargin ) {
                yMargin = ( ( xMax - xMin ) - ( yMax - yMin ) ) / 2 + xMargin;
            }
            else {
                xMargin = ( ( yMax - yMin ) - ( xMax - xMin ) ) / 2 + yMargin;
            }

            if( xMargin === 0 ) {
                // This means that xMax = xMin and yMax = yMin, which is not
                // acceptable.
                xMargin = 5;
                yMargin = 5;
            }
        }
        else {
            var xMargin = 0;
            var yMargin = 0;
        }

        return {
            xMin: xMin - xMargin, xMax: xMax + xMargin,
            yMin: yMin - yMargin, yMax: yMax + yMargin
        }
    };

    $.ec.Base.prototype.getPlotData = function() {
        return [];
    };

    $.ec.Base.prototype.makeLabel = function( name, color ) {
        return $( "<label class='point-label'></label>" )
            .text( name )
            .css({
                "position": "absolute",
                "width": "2em",
                "line-height": "2em",
                "text-align": "center",
                "border-radius": "50%",
                "opacity": "0.8",
                "background-color": color
            })
            .appendTo( this.plotContainer );
    };

    $.ec.Base.prototype.setLabel = function( label, p ) {
        if( p === null ) {
            label.css({ "display": "none" });
        }
        else {
            var xScale = this.plotContainer.width() /
                         ( this.plotRange.xMax - this.plotRange.xMin );
            var yScale = this.plotContainer.width() /
                         ( this.plotRange.yMax - this.plotRange.yMin );

            label.css({
                "display": "block",
                "left": xScale * ( p[ 0 ] - this.plotRange.xMin ) + 10 + "px",
                "top": yScale * ( this.plotRange.yMax - p[ 1 ] ) + 10 + "px"
            });
        }
    };

    $.ec.Base.prototype.getInputValues = function() {
        this.a = +this.aInput.val();
        this.b = +this.bInput.val();
    };

    $.ec.Base.prototype.recalculate = function() {
        // Order is important.
        this.roots = this.getRoots();
        this.plotRange = this.getPlotRange();
    };

    $.ec.Base.prototype.redraw = function() {
        var data = this.getPlotData();
        var axes = this.plot.getAxes();

        axes.xaxis.options.min = this.plotRange.xMin;
        axes.xaxis.options.max = this.plotRange.xMax;
        axes.yaxis.options.min = this.plotRange.yMin;
        axes.yaxis.options.max = this.plotRange.yMax;

        this.plot.setData( data );
        this.plot.setupGrid();
        this.plot.draw();
    };

    $.ec.Base.prototype.updateResults = function() {
        var getTerm = function( value, suffix ) {
            if( value > 0 ) {
                return " + " + value + suffix;
            }
            else if( value < 0 ) {
                return " - " + ( -value ) + suffix;
            }
            else {
                return "";
            }
        };

        this.equationContainer.html( "<em>y</em><sup>2</sup> = " +
                                     "<em>x</em><sup>3</sup> " +
                                     getTerm( this.a, "<em>x</em>" ) +
                                     getTerm( this.b, "" ) );

        this.singularWarning.css( "display",
                                  this.singular ? "block" : "none" );
    };

    $.ec.Base.prototype.update = function() {
        this.getInputValues();
        this.recalculate();
        this.updateResults();
        this.redraw();
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.reals.Base

    $.ec.reals.Base = function() {
        $.ec.Base.call( this );
        this.plotResolution = 256;
    };

    $.ec.reals.Base.prototype =
        Object.create( $.ec.Base.prototype );
    $.ec.reals.Base.prototype.constructor = $.ec.reals.Base;

    $.ec.reals.Base.prototype.getY = function( x ) {
        // Returns the ordinate >= 0 of the point with the given coordinate, or
        // NaN if the given point is not on the curve.
        return Math.sqrt( x * ( x * x + this.a ) + this.b );
    };

    $.ec.reals.Base.prototype.getX = function( y ) {
        // Returns all the possible coordinates corresponding to the given
        // ordinate.
        return this.getRoots( this.a, this.b - y * y );
    };

    $.ec.reals.Base.prototype.getStationaryPoints = function() {
        // This function returns the list of the x,y coordinates of the
        // stationary points of the curve. It works as follows.
        //
        // If we take the generic equation:
        //
        //     y^2 = x^3 + ax + b
        //
        // We can rewrite it as:
        //
        //     y = +- sqrt( x^3 + ax + b )
        //
        // The first derivative is:
        //
        //     y' = +- ( 3x^2 + a ) / ( 2 * sqrt( x^3 + ax + b ) )
        //
        // Which is zero only if ( 3x^2 + a ) = 0 or, equivalently, a = -3x^2.
        // In order to have a real x satifying the equation, we must have
        // a <= 0. Also, note that (if a <= 0) one solution for x is <= 0, the
        // other is >= 0.
        //
        // Substituting a in the first equation:
        //
        //     y^2 = x^3 + ax + b
        //     y^2 = x^3 - 3x^3 + b
        //     y^2 = b - 2x^3
        //
        // In order to have a real y, we must have b >= 2x^3. Remembering that
        // x0 <= 0 and x1 >= 0, we get that b >= 2 x1^3 implies b >= 2 x0^3. In
        // other words, if we have a stationary point with a positive
        // coordinate, then we must have an another stationary point with a
        // negative coordinate.
        //
        // Therefore...

        var x0 = -Math.sqrt( -this.a / 3 );
        var x1 = -x0;
        var y0 = Math.sqrt( this.b - 2 * x0 * x0 * x0 );
        var y1 = Math.sqrt( this.b - 2 * x1 * x1 * x1 );

        if( isNaN( x0 ) || isNaN( y0 ) ) {
            // If a = -3x^2 > 0, there are no real stationary points.
            // Similarly, if y^2 = b - 2x^3 < 0, there are no real stationary
            // points.
            //
            // Note that if there are no stationary points with a coordinate
            // <= 0, then there are no stationary points at all.
            return [];
        }
        else if( x0 === 0 || isNaN( y1 ) ) {
            // If a = 0 there is just one stationary point at x = 0.
            return [ [ x0, y0 ] ];
        }
        else {
            // In all other cases, we have two distinct stationary points.
            return [ [ x0, y0 ], [ x1, y1 ] ];
        }
    };

    $.ec.reals.Base.prototype.addPoints = function( p1, p2 ) {
        // Returns the result of adding point p1 to point p2, according to the
        // group law for elliptic curves. The point at infinity is represented
        // as null.

        if( p1 === null ) {
            return p2;
        }
        if( p2 === null ) {
            return p1;
        }

        var x1 = p1[ 0 ];
        var y1 = p1[ 1 ];
        var x2 = p2[ 0 ];
        var y2 = p2[ 1 ];
        var m;

        if( x1 !== x2 ) {
            // Two distinct points.
            m = ( y1 - y2 ) / ( x1 - x2 );
        }
        else {
            if( y1 === 0 && y2 === 0 ) {
                // This may only happen if p1 = p2 is a root of the elliptic
                // curve, hence the line is vertical.
                return null;
            }
            else if( y1 === y2 ) {
                // The points are the same, but the line is not vertical.
                m = ( 3 * x1 * x1 + this.a ) / y1 / 2;
            }
            else {
                // The points are the same and the line is vertical.
                return null;
            }
        }

        var x3 = m * m - x1 - x2;
        var y3 = m * ( x1 - x3 ) - y1;

        return [ x3, y3 ];
    };

    $.ec.reals.Base.prototype.negPoint = function( p ) {
        return [ p[ 0 ], -p[ 1 ] ];
    };

    $.ec.reals.Base.prototype.getPlotRange = function( points ) {
        // Finds a range for the x-axis and the y-axis. This range must:
        //
        // 1. show all the given points (if any);
        // 2. show the most interesting points of the curve (stationary points
        //    and roots);
        // 3. be proportional: i.e. the x-length and the y-length must be the
        //    same.

        if( typeof points === "undefined" ) {
            points = [];
        }
        else {
            points = points.slice( 0 );
        }

        for( var i = 0; i < this.roots.length; i += 1 ) {
            var x = this.roots[ i ];
            points.push([ x, 0 ]);
        }

        for( var i = 0; i < this.stationaryPoints.length; i += 1 ) {
            // stationaryPoints contains only the points above the x axis.
            var p = this.stationaryPoints[ i ];
            points.push( p );
            points.push([ p[ 0 ], -p[ 1 ] ]);
        }

        if( this.roots.length === 1 && this.stationaryPoints.length === 0 ) {
            // There is just one interesting point (the root). If there are no
            // other points, we risk displaying a degenerated plot. The root
            // will be in the left semiplane, we add a point to the right
            // semiplane.
            points.push([ 1, 0 ]);
        }

        return $.ec.Base.prototype.getPlotRange.call( this, points );
    };

    $.ec.reals.Base.prototype.getCurvePoints = function() {
        // Returns a list of x,y points belonging to the curve from xMin to
        // xMax. The resulting array is ordered and may contain some null
        // points in case of discontinuities.

        var points = [];
        var curve = this;
        var step = ( this.plotRange.xMax - this.plotRange.xMin )
                   / this.plotResolution;

        var getPoints = function( xMin, xMax, close ) {
            // This function calculates the points of a continuous branch of
            // the curve. The range from xMin to xMax must not contain any
            // discontinuity.
            var x;
            var y;
            var start = points.length;

            // Calculate all points above the x-axis, right-to-left (from xMax
            // to xMin). Note that getY() may return NaN if we are very close
            // to a root (because of floating point roundings).
            for( x = xMax; x > xMin; x -= step ) {
                y = curve.getY( x );
                points.push([ x, isNaN( y ) ? 0 : y ]);
            }

            // Ensure that xMin is calculated. In fact, ( xMax - xMin ) may not
            // be divisible by step.
            y = curve.getY( xMin );
            points.push([ xMin, isNaN( y ) ? 0 : y ]);

            // Now add the points below the x axis (remembering the simmetry of
            // elliptic curves), this time left-to-right.
            for( var i = points.length - 2; i >= start; i -= 1 ) {
                var p = points[ i ];
                points.push([ p[ 0 ], -p[ 1 ] ]);
            }

            if( close ) {
                // This is a closed curve.
                points.push( points[ start ] );
            }
        };

        if( this.roots.length < 3 ) {
            // We have either one or two roots. In any case, there is only one
            // continuous branch.
            getPoints( this.roots[ 0 ], this.plotRange.xMax, false );
        }
        else {
            // There are three roots. The curve is composed by: a closed
            // curve...
            getPoints( this.roots[ 0 ], this.roots[ 1 ], true );
            points.push( null );
            // ... and an open branch.
            getPoints( this.roots[ 2 ], this.plotRange.xMax, false );
        }

        return points;
    };

    $.ec.reals.Base.prototype.getLinePoints = function( p, q ) {
        var m = ( p[ 1 ] - q[ 1 ] ) / ( p[ 0 ] - q[ 0 ] );

        if( isNaN( m ) ) {
            // We are in the case p === q.
            m = ( 3 * p[ 0 ] * p[ 0 ] + this.a ) / p[ 1 ] / 2;
        }

        if( !isFinite( m ) ) {
            // This is a vertical line and p[ 0 ] === q[ 0 ].
            return [ [ p[ 0 ], this.plotRange.yMin ],
                     [ p[ 0 ], this.plotRange.yMax ] ];
        }

        return [ [ this.plotRange.xMin,
                   m * ( this.plotRange.xMin - p[ 0 ] ) + p[ 1 ] ],
                 [ this.plotRange.xMax,
                   m * ( this.plotRange.xMax - p[ 0 ] ) + p[ 1 ] ] ];
    };

    $.ec.reals.Base.prototype.getPlotData = function() {
        var data = $.ec.Base.prototype.getPlotData.call( this );

        data.push({
            color: colors.blue,
            data: this.getCurvePoints(),
            lines: { show: true }
        });

        return data;
    };

    $.ec.reals.Base.prototype.fixPointCoordinate = function( xInput, yInput ) {
        // Adjusts the x,y coordinates of a point so that it belongs to the
        // curve.

        var xVal = +xInput.val();
        var yVal = +yInput.val();
        var xPrevVal = +xInput.data( "prev" );
        var yPrevVal = +yInput.data( "prev" );

        if( isNaN( xVal ) || isNaN( yVal ) ) {
            // The user inserted an invalid number.
            return;
        }

        if( xVal === xPrevVal && yVal === yPrevVal ) {
            // The coordinates have not changed, however the curve parameters
            // may have changed. We need to check whether the coordinates make
            // sense.
            var validY = round10( this.getY( xVal ) );
            if( yVal < 0 ) {
                validY = -validY;
            }
            if( yVal === validY ) {
                // The coordinates are still perfectly valid. Nothing to do.
                return [ xVal, yVal ];
            }
        }

        if( xVal !== xPrevVal ) {
            if( xVal < this.roots[ 0 ] ) {
                // The x coordinate is invalid and the nearest valid point is
                // the leftmost root.
                xVal = this.roots[ 0 ];
                yVal = 0;
            }
            else if( this.roots.length > 2 &&
                     this.roots[ 1 ] < xVal &&
                     xVal < this.roots[ 2 ] ) {
                // The x coordinate is invalid and there are two roots that can
                // be considered valid. Choose the one that respects the
                // direction of the change.
                xVal = this.roots[ ( xVal > xPrevVal ) ? 2 : 1 ];
                yVal = 0;
            }
            else {
                // The x coordinate is valid. Choose the y coordinate in the
                // most appropriate semiplane.
                if( yVal > 0 ) {
                    yVal = this.getY( xVal );
                }
                else if( yVal < 0 ) {
                    yVal = -this.getY( xVal );
                }
                else if( yVal >= yPrevVal ) { // yVal = 0
                    yVal = this.getY( xVal );
                }
                else { // yVal = 0 && yVal < yPrevVal
                    yVal = -this.getY( xVal );
                }
            }
        }
        else {
            // Either y has changed or the curve parameters have changed.
            // Note that every curve is defined for all y, so we don't
            // have any domain problem here.
            var candidates = this.getX( yVal );
            var distances = candidates.map(function( x ) {
                return Math.abs( x - xPrevVal );
            });
            var lowestDistance = Math.min.apply( null, distances );

            xVal = candidates[ distances.indexOf( lowestDistance ) ];
        }

        // We are forced to round to avoid showing floating point errors that
        // lead to huge inconsistencies.
        xVal = round10( xVal );
        yVal = round10( yVal );

        xInput.val( xVal );
        yInput.val( yVal );

        xInput.data( "prev", xVal );
        yInput.data( "prev", yVal );

        return [ xVal, yVal ];
    };

    $.ec.reals.Base.prototype.recalculate = function() {
        this.singular =
            ( 4 * this.a * this.a * this.a + 27 * this.b * this.b ) === 0;
        this.stationaryPoints = this.getStationaryPoints();
        $.ec.Base.prototype.recalculate.call( this );
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.reals.PointAddition

    $.ec.reals.PointAddition = function() {
        $.ec.reals.Base.call( this );

        this.pxInput = $( "input[name='px']" );
        this.pyInput = $( "input[name='py']" );
        this.qxInput = $( "input[name='qx']" );
        this.qyInput = $( "input[name='qy']" );
        this.rxInput = $( "input[name='rx']" );
        this.ryInput = $( "input[name='ry']" );

        this.pxInput.data( "prev", this.pxInput.val() );
        this.pyInput.data( "prev", this.pyInput.val() );
        this.qxInput.data( "prev", this.qxInput.val() );
        this.qyInput.data( "prev", this.qyInput.val() );

        this.pLabel = this.makeLabel( "P", colors.yellow );
        this.qLabel = this.makeLabel( "Q", colors.yellow );
        this.rLabel = this.makeLabel( "R", colors.red );

        var curve = this;
        $().add( this.pxInput )
           .add( this.pyInput )
           .add( this.qxInput )
           .add( this.qyInput )
           .change(function() { curve.update(); });
    };

    $.ec.reals.PointAddition.prototype =
        Object.create( $.ec.reals.Base.prototype );
    $.ec.reals.PointAddition.prototype.constructor =
        $.ec.reals.PointAddition;

    $.ec.reals.PointAddition.prototype.getPlotRange = function( points ) {
        if( typeof points === "undefined" ) {
            points = [];
        }
        else {
            points = points.slice( 0 );
        }

        points.push( this.p );
        points.push( this.q );

        if( this.r !== null ) {
            points.push( this.r );
            points.push([ this.r[ 0 ], -this.r[ 1 ] ]);
        }

        return $.ec.reals.Base.prototype.getPlotRange.call( this, points );
    };

    $.ec.reals.PointAddition.prototype.getPlotData = function() {
        var data = $.ec.reals.Base.prototype.getPlotData.call( this );
        var linePoints = this.getLinePoints( this.p, this.q );

        if( this.r !== null ) {
            data.push({
                color: colors.red,
                data: [ this.r,
                        [ this.r[ 0 ], -this.r[ 1 ] ] ],
                lines: { show: true }
            });
            data.push({
                color: colors.red,
                data: [ this.r ],
                points: { show: true, radius: 5 },
            });
        }

        data.push({
            color: "#edc240",
            data: linePoints,
            lines: { show: true }
        });
        data.push({
            color: colors.yellow,
            data: [ this.p, this.q ],
            points: { show: true, radius: 5 }
        });

        return data;
    };

    $.ec.reals.PointAddition.prototype.getInputValues = function() {
        $.ec.reals.Base.prototype.getInputValues.call( this );
        this.p = this.fixPointCoordinate( this.pxInput, this.pyInput );
        this.q = this.fixPointCoordinate( this.qxInput, this.qyInput );
    };

    $.ec.reals.PointAddition.prototype.recalculate = function() {
        this.r = this.addPoints( this.p, this.q );
        $.ec.reals.Base.prototype.recalculate.call( this );
    };

    $.ec.reals.PointAddition.prototype.redraw = function() {
        $.ec.reals.Base.prototype.redraw.call( this );
        this.setLabel( this.pLabel, this.p );
        this.setLabel( this.qLabel, this.q );
        this.setLabel( this.rLabel, this.r );
    };

    $.ec.reals.PointAddition.prototype.updateResults = function() {
        $.ec.reals.Base.prototype.updateResults.call( this );

        if( this.r !== null ) {
            this.rxInput.val( round10( this.r[ 0 ] ) );
            this.ryInput.val( round10( this.r[ 1 ] ) );
        }
        else {
            this.rxInput.val( "Inf" );
            this.ryInput.val( "Inf" );
        }
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.reals.ScalarMultiplication

    $.ec.reals.ScalarMultiplication = function() {
        $.ec.reals.Base.call( this );

        this.nInput = $( "input[name='n']" );
        this.pxInput = $( "input[name='px']" );
        this.pyInput = $( "input[name='py']" );
        this.qxInput = $( "input[name='qx']" );
        this.qyInput = $( "input[name='qy']" );

        this.pxInput.data( "prev", this.pxInput.val() );
        this.pyInput.data( "prev", this.pyInput.val() );

        this.pLabel = this.makeLabel( "P", colors.yellow );
        this.qLabel = this.makeLabel( "Q", colors.red );

        var curve = this;
        $().add( this.nInput )
           .add( this.pxInput )
           .add( this.pyInput )
           .change(function() { curve.update(); });
    };

    $.ec.reals.ScalarMultiplication.prototype =
        Object.create( $.ec.reals.Base.prototype );
    $.ec.reals.ScalarMultiplication.prototype.constructor =
        $.ec.reals.ScalarMultiplication;

    $.ec.reals.ScalarMultiplication.prototype.getPlotRange = function(
            points ) {
        if( typeof points === "undefined" ) {
            points = [];
        }
        else {
            points = points.slice( 0 );
        }

        points.push( this.p );

        if( this.q !== null ) {
            points.push( this.q );
        }

        return $.ec.reals.Base.prototype.getPlotRange.call( this, points );
    };

    $.ec.reals.ScalarMultiplication.prototype.getPlotData = function() {
        var data = $.ec.reals.Base.prototype.getPlotData.call( this );

        if( false ) {
            var p = this.p;
            var n = this.n;

            if( n < 0 ) {
                p = this.negPoint( p );
                n = -n;
            }

            var q = p;
            var pattern = [ q ];

            for( var i = 1; i < n; i += 1 ) {
                q = this.addPoints( p, q );
                pattern.push( q );
            }

            data.push({
                color: colors.yellow,
                data: pattern,
                lines: { show: true }
            });
        }

        data.push({
            color: colors.yellow,
            data: [ this.p ],
            points: { show: true, radius: 5 }
        });

        if( this.q !== null ) {
            data.push({
                color: colors.red,
                data: [ this.q ],
                points: { show: true, radius: 5 }
            });
        }

        return data;
    };

    $.ec.reals.ScalarMultiplication.prototype.getInputValues = function() {
        $.ec.reals.Base.prototype.getInputValues.call( this );
        this.n = +this.nInput.val();
        this.p = this.fixPointCoordinate( this.pxInput, this.pyInput );
    };

    $.ec.reals.ScalarMultiplication.prototype.recalculate = function() {
        this.q = this.mulPoint( this.n, this.p );
        $.ec.reals.Base.prototype.recalculate.call( this );
    };

    $.ec.reals.ScalarMultiplication.prototype.redraw = function() {
        $.ec.reals.Base.prototype.redraw.call( this );
        this.setLabel( this.pLabel, this.p );
        this.setLabel( this.qLabel, this.q );
    };

    $.ec.reals.ScalarMultiplication.prototype.updateResults = function() {
        $.ec.reals.Base.prototype.updateResults.call( this );

        if( this.q !== null ) {
            this.qxInput.val( round10( this.q[ 0 ] ) );
            this.qyInput.val( round10( this.q[ 1 ] ) );
        }
        else {
            this.qxInput.val( "Inf" );
            this.qyInput.val( "Inf" );
        }
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.modk.Base

    $.ec.modk.Base = function() {
        $.ec.Base.call( this );

        this.marginFactor = 0;
        this.kInput = $( "input[name='p']" );

        this.compositeWarning = $( ".composite-warning" );
        this.fieldOrder = $( ".field-order" );
        this.curveOrder = $( ".curve-order" );

        var curve = this;
        this.kInput.change(function() { curve.update() });
    };

    $.ec.modk.Base.prototype = Object.create(
        $.ec.Base.prototype );
    $.ec.modk.Base.prototype.constructor = $.ec.modk.Base;

    $.ec.modk.Base.prototype.getY = function( x ) {
        // Returns all the possible ordinates corresponding to the given
        // coordinate.

        var result = [];

        for( var i = 0; i < this.curvePoints.length; i += 1 ) {
            var p = this.curvePoints[ i ];
            if( p[ 0 ] === x ) {
                result.push( p[ 1 ] );
            }
        }

        return result;
    };

    $.ec.modk.Base.prototype.getX = function( y ) {
        // Returns all the possible coordinates corresponding to the given
        // ordinate.

        var result = [];

        for( var i = 0; i < this.curvePoints.length; i += 1 ) {
            var p = this.curvePoints[ i ];
            if( p[ 1 ] === y ) {
                result.push( p[ 2 ] );
            }
        }

        return result;
    };

    $.ec.modk.Base.prototype.hasPoint = function( x, y ) {
        // Returns true if the point x,y belongs to the curve.

        for( var i = 0; i < this.curvePoints.length; i += 1 ) {
            var p = this.curvePoints[ i ];
            if( p[ 0 ] === x && p[ 1 ] === y ) {
                return true;
            }
        }

        return false;
    };

    $.ec.modk.Base.prototype.inverseOf = function( n ) {
        n = ( +n ) % this.k;

        if( n < 0 ) {
            n = n + this.k;
        }

        for( var m = 0; m < this.k; m += 1 ) {
            if( ( n * m ) % this.k === 1 ) {
                return m;
            }
        }

        return NaN;
    };

    $.ec.modk.Base.prototype.addPoints = function( p1, p2 ) {
        // Returns the result of adding point p1 to point p2, according to the
        // group law for elliptic curves. The point at infinity is represented
        // as null.

        if( p1 === null ) {
            return p2;
        }
        if( p2 === null ) {
            return p1;
        }

        var x1 = p1[ 0 ];
        var y1 = p1[ 1 ];
        var x2 = p2[ 0 ];
        var y2 = p2[ 1 ];
        var m;

        if( x1 !== x2 ) {
            // Two distinct points.
            m = ( y1 - y2 ) * this.inverseOf( x1 - x2 );
        }
        else {
            if( y1 === 0 && y2 === 0 ) {
                // This may only happen if p1 = p2 is a root of the elliptic
                // curve, hence the line is vertical.
                return null;
            }
            else if( y1 === y2 ) {
                // The points are the same, but the line is not vertical.
                m = ( 3 * x1 * x1 + this.a ) * this.inverseOf( 2 * y1 );
            }
            else {
                // The points are not the same and the line is vertical.
                return null;
            }
        }

        m %= this.k;

        var x3 = ( m * m - x1 - x2 ) % this.k;
        var y3 = ( m * ( x1 - x3 ) - y1 ) % this.k;

        if( x3 < 0 ) {
            x3 += this.k;
        }
        if( y3 < 0 ) {
            y3 += this.k;
        }

        return [ x3, y3 ];
    };

    $.ec.modk.Base.prototype.negPoint = function( p ) {
        return [ p[ 0 ], this.k - p[ 1 ] ];
    };

    $.ec.modk.Base.prototype.getPlotRange = function( points ) {
        // Finds a range for the x-axis and the y-axis. This range must:
        //
        // 1. show all the given points (if any);
        // 2. show the most interesting points of the curve (stationary points
        //    and roots);
        // 3. be proportional: i.e. the x-length and the y-length must be the
        //    same.

        if( typeof points === "undefined" ) {
            points = [];
        }
        else {
            points = points.slice( 0 );
        }

        points.push([ 0, 0 ]);
        points.push([ this.k - 1, this.k - 1 ]);

        return $.ec.Base.prototype.getPlotRange.call( this, points );
    };

    $.ec.modk.Base.prototype.getCurvePoints = function() {
        // Returns a list of x,y points belonging to the curve from xMin to
        // xMax. The resulting array is ordered and may contain some null
        // points in case of discontinuities.

        var points = [];

        for( var x = 0; x < this.k; x += 1 ) {
            for( var y = 0; y < this.k; y += 1 ) {
                if( ( y * y - x * x * x - this.a * x - this.b ) % this.k
                        === 0 ) {
                    points.push([ x, y ]);
                }
            }
        }

        return points;
    };

    $.ec.modk.Base.prototype.getLinePoints = function( p, q ) {
        var m = ( p[ 1 ] - q[ 1 ] ) * this.inverseOf( p[ 0 ] - q[ 0 ] );

        if( isNaN( m ) ) {
            if( p[ 1 ] === q[ 1 ] ) {
                // We are in the case p === q.
                m = ( 3 * p[ 0 ] * p[ 0 ] + this.a ) *
                    this.inverseOf( 2 * p[ 1 ] );
            }
            else {
                // This is a vertical line.
                return [ [ p[ 0 ], this.plotRange.yMin ],
                         [ p[ 0 ], this.plotRange.yMax ] ];
            }
        }

        if( m === 0 ) {
            // This is a horizontal line and p[ 1 ] === q[ 1 ].
            return [ [ this.plotRange.xMin, p[ 1 ] ],
                     [ this.plotRange.xMax, p[ 1 ] ] ];
        }

        m %= this.k;

        // m can be either a negative or a positive number (for example, if we
        // have k = 7, m = -1 and m = 6 are equivalent). Technically, it does
        // not make any difference. Choose the one with the lowest absolute
        // value, as this number will produce fewer lines, resulting in a nicer
        // plot.
        if( m < 0 && -m > m + this.k ) {
            m += this.k;
        }
        else if( m > 0 && -m < m - this.k ) {
            m -= this.k;
        }

        var y;
        var x;
        var q = p[ 1 ] - m * p[ 0 ];
        var points = [];

        // Find the q corresponding to the "leftmost" line. This is the q that
        // when used in the equation y = m * x + q and x = 0 gives 0 <= y < k.
        while( q >= this.k ) {
            q -= this.k;
        }
        while( q < 0 ) {
            q += this.k;
        }

        points.push([ this.plotRange.xMin, m * this.plotRange.xMin + q ]);

        do {
            if( m > 0 ) {
                // The line has a positive slope; find the coordinate of the
                // point having the highest ordinate. If the line equation is:
                // y = m * x + q, then the point coordinate is given by:
                // k = m * x + q.
                y = this.k;
            }
            else {
                // Slope is negative; find the coordinate of the point having
                // the lowest ordinate. If the line equation is: y = m * x + q,
                // then the point coordinate is given by: 0 = m * x + q.
                y = 0;
            }

            x = ( y - q ) / m;

            points.push([ x, y ]);
            points.push( null );

            points.push([ x, y ? 0 : this.k ]);

            if( m > 0 ) {
                q -= this.k;
            }
            else {
                q += this.k;
            }
        } while( x < this.k );

        points.push([ this.plotRange.xMax, m * this.plotRange.xMax + q ]);

        return points;
    };

    $.ec.modk.Base.prototype.getPlotData = function() {
        var data = $.ec.Base.prototype.getPlotData.call( this );

        data.push({
            color: colors.blue,
            data: this.curvePoints,
            points: { show: true, radius: 3 }
        });

        return data;
    };

    $.ec.modk.Base.prototype.fixPointCoordinate = function( xInput, yInput ) {
        // Adjusts the x,y coordinates of a point so that it belongs to the
        // curve.

        var xVal = +xInput.val();
        var yVal = +yInput.val();
        var xPrevVal = +xInput.data( "prev" );
        var yPrevVal = +yInput.data( "prev" );

        if( isNaN( xVal ) || isNaN( yVal ) ) {
            // The user inserted an invalid number.
            return [ xPrevVal, yPrevVal ];
        }

        if( this.hasPoint( xVal, yVal ) ) {
            // This point exists -- nothing to do.
            return [ xVal, yVal ];
        }

        // Find a list of candidate points that respect the direction of the
        // change.
        if( xVal > xPrevVal ) {
            var check = function( p ) {
                return p[ 0 ] > xPrevVal;
            }
        }
        else if( xVal < xPrevVal ) {
            var check = function( p ) {
                return p[ 0 ] < xPrevVal;
            }
        }
        else if( yVal > yPrevVal ) {
            var check = function( p ) {
                return p[ 1 ] > yPrevVal;
            }
        }
        else if( yVal < yPrevVal ) {
            var check = function( p ) {
                return p[ 1 ] < yPrevVal;
            }
        }
        else {
            // Neither xVal nor yVal have changed (but probably a, b or k
            // have).
            var check = function( p ) {
                return true;
            }
        }

        var candidates = [];

        for( var i = 0; i < this.curvePoints.length; i += 1 ) {
            var p = this.curvePoints[ i ];
            if( check( p ) ) {
                candidates.push( p );
            }
        }

        if( candidates.length === 0 ) {
            if( this.hasPoint( xPrevVal, yPrevVal ) ) {
                // There are no candidates and the previous point is still
                // valid.
                xInput.val( xPrevVal );
                yInput.val( yPrevVal );
                return [ xPrevVal, yPrevVal ];
            }

            // There are no candidates but the previous point is no longer
            // valid (this may happen if a, b or k have changed).
            candidates = this.curvePoints;

            if( candidates.length === 0 ) {
                // Nothing to do.
                return [ xPrevVal, yPrevVal ];
            }
        }

        var distances = candidates.map(function( p ) {
            var deltaX = xVal - p[ 0 ];
            var deltaY = yVal - p[ 1 ];
            return deltaX * deltaX + deltaY * deltaY;
        });
        var lowestDistance = Math.min.apply( null, distances );

        var p = candidates[ distances.indexOf( lowestDistance ) ];

        xInput.val( p[ 0 ] );
        yInput.val( p[ 1 ] );

        xInput.data( "prev", p[ 0 ] );
        yInput.data( "prev", p[ 1 ] );

        return [ p[ 0 ], p[ 1 ] ];
    };

    $.ec.modk.Base.prototype.getInputValues = function() {
        $.ec.Base.prototype.getInputValues.call( this );

        this.k = +this.kInput.val();
        this.prime = isPrime( this.k );

        // This must go here, rather than in recalculate(), because
        // fixPointCoordinates() depends on curvePoints.
        this.curvePoints = this.getCurvePoints();
    };

    $.ec.modk.Base.prototype.updateResults = function() {
        $.ec.Base.prototype.updateResults.call( this );
        this.compositeWarning.css({ "display":
                                    this.prime ? "none" : "block" });
        this.fieldOrder.text( this.k );
        this.curveOrder.text( this.curvePoints.length + 1 );
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.modk.PointAddition

    $.ec.modk.PointAddition = function() {
        $.ec.modk.Base.call( this );

        this.pxInput = $( "input[name='px']" );
        this.pyInput = $( "input[name='py']" );
        this.qxInput = $( "input[name='qx']" );
        this.qyInput = $( "input[name='qy']" );
        this.rxInput = $( "input[name='rx']" );
        this.ryInput = $( "input[name='ry']" );

        this.pxInput.data( "prev", this.pxInput.val() );
        this.pyInput.data( "prev", this.pyInput.val() );
        this.qxInput.data( "prev", this.qxInput.val() );
        this.qyInput.data( "prev", this.qyInput.val() );

        this.pLabel = this.makeLabel( "P", colors.yellow );
        this.qLabel = this.makeLabel( "Q", colors.yellow );
        this.rLabel = this.makeLabel( "R", colors.red );

        var curve = this;
        $().add( this.pxInput )
           .add( this.pyInput )
           .add( this.qxInput )
           .add( this.qyInput )
           .change(function() { curve.update(); });
    };

    $.ec.modk.PointAddition.prototype =
        Object.create( $.ec.modk.Base.prototype );
    $.ec.modk.PointAddition.prototype.constructor =
        $.ec.modk.PointAddition;

    $.ec.modk.PointAddition.prototype.getPlotData = function() {
        var data = $.ec.modk.Base.prototype.getPlotData.call( this );
        var linePoints = this.getLinePoints( this.p, this.q );

        if( this.r !== null ) {
            data.push({
                color: colors.red,
                data: [ this.r,
                        [ this.r[ 0 ], this.k - this.r[ 1 ] ] ],
                lines: { show: true }
            });
            data.push({
                color: colors.red,
                data: [ this.r ],
                points: { show: true, radius: 5 },
            });
        }

        data.push({
            color: colors.yellow,
            data: linePoints,
            lines: { show: true }
        });
        data.push({
            color: colors.yellow,
            data: [ this.p, this.q ],
            points: { show: true, radius: 5 }
        });

        return data;
    };

    $.ec.modk.PointAddition.prototype.getInputValues = function() {
        $.ec.modk.Base.prototype.getInputValues.call( this );
        this.p = this.fixPointCoordinate( this.pxInput, this.pyInput );
        this.q = this.fixPointCoordinate( this.qxInput, this.qyInput );
    };

    $.ec.modk.PointAddition.prototype.recalculate = function() {
        this.singular =
            ( 4 * this.a * this.a * this.a + 27 * this.b * this.b ) % this.k === 0;
        this.r = this.addPoints( this.p, this.q );
        $.ec.modk.Base.prototype.recalculate.call( this );
    };

    $.ec.modk.PointAddition.prototype.redraw = function() {
        $.ec.modk.Base.prototype.redraw.call( this );
        this.setLabel( this.pLabel, this.p );
        this.setLabel( this.qLabel, this.q );
        this.setLabel( this.rLabel, this.r );
    };

    $.ec.modk.PointAddition.prototype.updateResults = function() {
        $.ec.modk.Base.prototype.updateResults.call( this );

        if( this.r !== null ) {
            this.rxInput.val( round10( this.r[ 0 ] ) );
            this.ryInput.val( round10( this.r[ 1 ] ) );
        }
        else {
            this.rxInput.val( "Inf" );
            this.ryInput.val( "Inf" );
        }
    };

    ///////////////////////////////////////////////////////////////////////////
    // $.ec.modk.ScalarMultiplication

    $.ec.modk.ScalarMultiplication = function() {
        $.ec.modk.Base.call( this );

        this.nInput = $( "input[name='n']" );
        this.pxInput = $( "input[name='px']" );
        this.pyInput = $( "input[name='py']" );
        this.qxInput = $( "input[name='qx']" );
        this.qyInput = $( "input[name='qy']" );

        this.subgroupOrder = $( ".subgroup-order" );

        this.pxInput.data( "prev", this.pxInput.val() );
        this.pyInput.data( "prev", this.pyInput.val() );

        this.pLabel = this.makeLabel( "P", colors.yellow );
        this.qLabel = this.makeLabel( "Q", colors.red );

        var curve = this;
        $().add( this.nInput )
           .add( this.pxInput )
           .add( this.pyInput )
           .change(function() { curve.update(); });
    };

    $.ec.modk.ScalarMultiplication.prototype =
        Object.create( $.ec.modk.Base.prototype );
    $.ec.modk.ScalarMultiplication.prototype.constructor =
        $.ec.modk.ScalarMultiplication;

    $.ec.modk.ScalarMultiplication.prototype.getPlotRange = function(
            points ) {
        if( typeof points === "undefined" ) {
            points = [];
        }
        else {
            points = points.slice( 0 );
        }

        points.push( this.p );

        if( this.q !== null ) {
            points.push( this.q );
        }

        return $.ec.modk.Base.prototype.getPlotRange.call( this, points );
    };

    $.ec.modk.ScalarMultiplication.prototype.getPlotData = function() {
        var data = $.ec.modk.Base.prototype.getPlotData.call( this );

        data.push({
            color: colors.yellow,
            data: [ this.p ],
            points: { show: true, radius: 5 }
        });

        if( this.q !== null ) {
            data.push({
                color: colors.red,
                data: [ this.q ],
                points: { show: true, radius: 5 }
            });
        }

        return data;
    };

    $.ec.modk.ScalarMultiplication.prototype.getSubgroupOrder = function() {
        if( this.singular || !this.prime ) {
            return 0;
        }

        var n = 2;
        var q = this.addPoints( this.p, this.p );

        while( q !== null ) {
            q = this.addPoints( this.p, q );
            n += 1;
        }

        return n;
    };

    $.ec.modk.ScalarMultiplication.prototype.getInputValues = function() {
        $.ec.modk.Base.prototype.getInputValues.call( this );
        this.n = +this.nInput.val();
        this.p = this.fixPointCoordinate( this.pxInput, this.pyInput );
    };

    $.ec.modk.ScalarMultiplication.prototype.recalculate = function() {
        this.q = this.mulPoint( this.n, this.p );
        $.ec.modk.Base.prototype.recalculate.call( this );
    };

    $.ec.modk.ScalarMultiplication.prototype.redraw = function() {
        $.ec.modk.Base.prototype.redraw.call( this );
        this.setLabel( this.pLabel, this.p );
        this.setLabel( this.qLabel, this.q );
    };

    $.ec.modk.ScalarMultiplication.prototype.updateResults = function() {
        $.ec.modk.Base.prototype.updateResults.call( this );

        if( this.q !== null ) {
            this.qxInput.val( round10( this.q[ 0 ] ) );
            this.qyInput.val( round10( this.q[ 1 ] ) );
        }
        else {
            this.qxInput.val( "Inf" );
            this.qyInput.val( "Inf" );
        }

        this.subgroupOrder.text( this.getSubgroupOrder() );
    };

}( jQuery ));
