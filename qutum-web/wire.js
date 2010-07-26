//
// Qutum 10 implementation
// Copyright 2008-2010 Qianyan Cai
// Under the terms of the GNU General Public License version 3
// http://qutum.com
//
(function () {

Wire = function ()
{
}
var S = Datum.SPACE / 4, SS = Datum.SPACE / 2

Wire.prototype =
{

edit: null,
base: null,
agent: null,
zone: null,
zb: null,
za: null,
yield: 0, // yield, with error

err: '',
showing: false,
xys: null, // [] based on zone rather than wire
x: 0,
y: 0,
w: 0,
h: 0,
dragMode: 0,
nowPrev: null,
nowNext: null,

addTo: function (b, a)
{
	if (b != a)
	{
		var d = b.deep - a.deep
		var zb = this.base = b, za = this.agent = a
		while (d > 0)
			b = (zb = b).zone, --d
		while (d < 0)
			a = (za = a).zone, ++d
		while (b != a)
			b = (zb = b).zone, a = (za = a).zone
		this.edit = b.edit
		this.zone = b
		b.wires.push(this)
		this.zb = zb, this.za = za
		this.yield || this.compile1() // skip layout if error
	}
	else
		this.zone.wires.push(this)
	this.showing = true, this.edit.show()
},

unadd: function ()
{
	ArrayRem(this.zone.wires, this) // no zone layout
	var p = this.nowPrev, n = this.nowNext
	this.edit.now == this && (this.edit.now = nowPrev)
	p && (p.nowNext = n), n && (n.nowPrev = p)
	this.nowPrev = this.nowNext = null
},

////////////////////////////////      ////////////////////////////////
//////////////////////////////// view ////////////////////////////////
////////////////////////////////      ////////////////////////////////

layout: function (force)
{
	if ( !this.showing && !force)
		return
	this.showing = false
	if (this.zone.detail <= 2)
		return this.xys = null

	var xys = this.xys = [], zone = this.zone, base = this.base, agent = this.agent,
		zb = this.zb, za = this.za, bx, by, b5, bq, ax, ay, aw, a5, aq, x, y, i
	bx = base.offsetX(zone), b5 = bx + base.w / 2
	bq = base.w ? 1 : 0
	if (base != zone)
		by = this.err ? base.offsetY(zone) + base.h - bq : zb.y + zb.h - 1
	x = agent.offsetX(zone), y = agent.offsetY(zone)
	if (this.err || base == zone)
		ax = x, ay = y, aw = agent.w, a5 = ax + aw / 2
	else
		ax = za.x, ay = za.y, aw = za.w, a5 = ax + aw / 2
	aq = agent.w ? 1 : 0
	if (b5 < ax && bx + base.w < a5)
		bx += base.w - bq, aw = 0 // right of base, left of agent
	else if (a5 < bx && ax + aw < b5)
		bx += bq // left of base, right of agent
	else if ((b5 < a5) == (base.w < aw))
		bx += bq, aw = 0 // left of base, left of agent
	else
		bx += base.w - bq // right of base, right of agent
	if (this.err)
		xys.push(ax, ay, bx, base == zone ? ay : by)
	else
	{
		ax = aw ? x - aq : x + aq, ay = y + aq
		xys.push(x = aw ? ax + agent.w : ax, y = ay)
		var azer = agent.azer, a = agent, r
		for (; a != azer; a = a.zone)
			ax -= a.x, ay -= a.y
		while (a != za || base == zone)
		{
			Up: if (a.detail >= 2)
			{
				r = a.row
				Hori: if (a != azer || agent == azer)
					if (aw)
					{
						for (i = r.length - 1; a != r[i]; i--)
							if (r[i].y - a.y <= y - ay)
								break Hori
						break Up
					}
					else
					{
						for (i = 0; a != r[i]; i++)
							if (r[i].y - a.y <= y - ay)
								break Hori
						break Up
					}
				xys.push(x, y = ay - a.y + r.y - S - SS * a.x / r.w)
			}
			if (a == za)
				break // base == zone
			ax -= a.x, ay -= a.y
			a = a.zone
			if (a.detail >= 2)
				x = S + S * (y - ay) / a.h,
				xys.push(x = aw ? ax + a.w + x : ax - x, y)
		}
		if (base == zone)
			by = y
		else if ((r = a.row) == zb.row)
		{
			ax = x
			if (ax == a.x + aq)
				xys.push(ax -= S + S, y)
			if (r[i = r.indexOf(a) - 1] == zb && base == zb)
				xys.push(ax, by)
			else
				xys.push(ax, ay = r.y + r.h + S + SS * bx / r.w, bx, ay)
		}
		else
		{
			ax = x, ay = r.y - S - SS * a.x / zone.w
			xys.push(ax, ay)
			i = zone.rows.indexOf(r)
			while ((r = zone.rows[--i]) != zb.row)
			{
				d = r[r.searchDatumX(ax)]
				if (d && ax > d.x - S && ax < d.x + d.w + S)
					if (ax < d.x + d.w / 2)
						ax = d.x - S - S * ax / zone.w
					else
						ax = d.x + d.w + S + S * ax / zone.w
				xys.push(ax, ay)
				xys.push(ax, ay = r.y - S - SS * ax / zone.w)
			}
			if (ax - bx < -2 || ax - bx > 2)
				xys.push(bx, ay)
		}
		xys.push(bx, by)
	}
	var x0 = Infinity, y0 = Infinity, x9 = 0, y9 = 0
	for (i = xys.length - 1; i > 0; )
		y = xys[i--], x = xys[i--],
		x < x0 ? x0 = x : x > x9 && (x9 = x),
		y < y0 ? y0 = y : y > y9 && (y9 = y)
	this.x = x0 - 2, this.y = y0 - 2
	this.w = x9 - x0 + 4, this.h = y9 - y0 + 4
},

show: function (draw, X, Y, W, H)
{
	var s = this.xys
	if ( !s)
		return
	if (this != this.edit.now)
		draw.strokeStyle = this.err ? '#f33' : '#555',
		draw.lineWidth = this.yield ? 1.125 : 2
	else
		draw.strokeStyle = this.err ? '#f00' : '#080',
		draw.lineWidth = this.yield ? 1.875 : 2.5
	draw.beginPath()
	draw.moveTo(s[0] - X, s[1] - Y)
	for (var i = 2, n = s.length; i < n; )
		draw.lineTo(s[i++] - X, s[i++] - Y)
	draw.stroke()
},

Hit: function (draw, x, y)
{
	var xx = this.x, yy = this.y, w = this.w, h = this.h
	Util.draw(draw, x + xx, y + yy, w, h)
	draw.clearRect(0, 0, w, h)
	var s = this.xys
	if ( !s)
		return
	if (this != this.edit.now)
	{
		draw.strokeStyle = this.err ? '#f00' : '#6c6',
		draw.lineWidth = this.yield ? 2.125 : 2.5
		draw.beginPath()
		draw.moveTo(s[0] - xx, s[1] - yy)
		for (var i = 2, n = s.length; i < n; )
			draw.lineTo(s[i++] - xx, s[i++] - yy)
		draw.stroke()
	}
},

hit: function (x, y)
{
	var s
	if (x < this.x || y < this.y || x >= this.x + this.w || y >= this.y + this.h)
		return null
	if ( !(s = this.xys))
		return null
	var x1 = s[0], y1 = s[1], x2, y2
	for (var i = 2, n = s.length; i < n; )
	{
		x2 = s[i++], y2 = s[i++]
		if (y1 == y2
			? y - y1 > -3 && y - y1 < 3 && (x1 < x2 ? x >= x1 && x <= x2 : x >= x2 && x <= x1)
			: x - x1 > -3 && x - x1 < 3 && (y1 < y2 ? y >= y1 && y <= y2 : y >= y2 && y <= y1))
			return this
		x1 = x2, y1 = y2
	}
	return null
},

offsetX: function (z)
{
	for (var x = 0, d = this; d != z; d = d.zone)
		x += d.x
	return x
},

offsetY: function (z)
{
	for (var y = 0, d = this; d != z; d = d.zone)
		y += d.y
	return y
},

////////////////////////////////      ////////////////////////////////
//////////////////////////////// edit ////////////////////////////////
////////////////////////////////      ////////////////////////////////

nowLeft: function ()
{
},

nowRight: function ()
{
},

nowUp: function ()
{
},

nowDown: function ()
{
},

nowHome: function ()
{
},

nowEnd: function ()
{
},

nowZone: function ()
{
},

nowInner: function ()
{
},

////////////////////////////////         ////////////////////////////////
//////////////////////////////// compile ////////////////////////////////
////////////////////////////////         ////////////////////////////////

compile1: function ()
{
	this.err != (this.err = this.error1()) && (this.showing = true, this.edit.show())
	this.err && (this.edit.error = 1)
},

error1: function ()
{
	var base = this.base, agent = this.agent 
	if (base.tv > 0 || base.zv)
		return 'base must not be veto or inside'
	if (agent.tv > 0 || agent.zv)
		return 'agent must not be veto or inside'
	var zone = this.zone, az = agent.azer, a, z
	if (base != zone && base.bzer != this.zb)
		return "base or base zoner's zone must be wire zone"
	if (az.deep <= zone.deep)
		return 'agent zoner must be inside wire zone'
	if (base != zone && this.zb.el >= this.za.el)
		return 'must wire early to later'
	if ( !zone.gene)
		if (base != zone && !base.io)
			return 'wire inside agent must have input or output base'
		else if ( !agent.io)
			return 'wire inside agent must have input or output agent'
	for (a = az.zone; a != zone; a = a.zone)
		if (a.io < 0)
			return 'wire must not cross input edge'
	for (a = az.zone; a != zone; a = z, z = z.zone)
		if (z = a.zone, !a.gene && z.gene)
			return 'wire must not cross agent edge from gene'
	return ''
},

}

})()