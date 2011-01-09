//
// Qutum 10 implementation
// Copyright 2008-2011 Qianyan Cai
// Under the terms of the GNU General Public License version 3
// http://qutum.com
//
(function () {

Datum = function (io)
{
	this.io = io
	io && (this.unity = new String(++Unity), this.unity.d = this)
	this.uNext = this.uPrev = this
	this.rows = []
	this.wires = []
	this.bs = []
	this.as = []
}
var Unity = 0,
	SIZE0 = Datum.SIZE0 = 20, SPACE = Datum.SPACE = 20, NAME_WIDTH = Datum.NAME_WIDTH = 50

Datum.prototype =
{

edit: null,
zone: null,
deep: 1, // zone.deep + 1
io: 0, // <0 input >0 output 0 neither input nor output
unity: null, // which d is one datum of same unity
uNext: null, // next unity
uPrev: null, // previous unity
gene: false,
tv: 0, // >0 trial <0 veto 0 neither
zv: false, // zoner is veto
bzer: null, // innermost non output zoner or this, as base zoner
azer: null, // innermost non input zoner or this, as agent zoner
bs: null, // [Wire]
as: null, // [Wire]
cycle: null, // cycle base
el: 0, // early or later in the zone, [ x-0x400000, x, x+0x400000 ]
layer: 0, // 0 for layer 1, 2 for layer 2
row: null, // null for zonest
rows: null, // []
wires: null, // []

mustRun: false, // must run or may run, as agent zoner
yield: 0,
yR: 0,
yD: 0,
unyR: 0,
unyD: 0,
us: null, // {}
bbs: null, // [Wiring]
base0: 0, // the maximum deep of all outermost bases
mn: 0, // match iteration

name: '',
nameY: 0, // text top
nameR: 0, // with left and right margin of around 3px each
nameH: 0, // with top and bottom margin of around 3px each
err: '',
x: 0,
y: 0,
w: 0,
h: 0,
ox: -1, // -1: no inner datum, >=1: output row index, == rows.length - 1
detail: 2, // 1: hide, 2: only this, 3: this and inners
showing: 0,
navPrev: null,
navNext: null,

////////////////////////////////       ////////////////////////////////
//////////////////////////////// logic ////////////////////////////////
////////////////////////////////       ////////////////////////////////

addTo: function (z, r, q) // x < 0 to add row
{
	if (z == null)
	{
		this.deep = 1
		this.gene = true
		this.bzer = this
		this.azer = this
		return this // zonest
	}
	if (z.ox < 0)
		z.rows[0] = Row(z, []), z.rows[1] = Row(z, []),
		z.ox = 1
	if (q < 0)
		z.rows.splice(r, 0, this.row = Row(z, [ this ])),
		z.ox++, q = 0
	else
		(this.row = z.rows[r]).splice(q, 0, this)
	if ( !this.zone)
	{
		this.edit = z.edit
		this.zone = z
		this.deep = z.deep + 1
		if (this.io < 0)
			this.bzer = this,
			this.azer = z.io < 0 ? z.azer : z,
			// early or later in the zone, [ x-0x400000, x, x+0x400000 ]			
			this.el = q - 0x400000 // also for loading
		else if (this.io > 0)
			this.gene = z.gene,
			this.bzer = z.io > 0 ? z.bzer : z,
			this.azer = this,
			this.el = q + 0x400000 // also for loading
		else
			this.gene = z.gene,
			this.bzer = this.azer = this,
			this.el = r <= 1 ? q // for loading
				: q ? z.rows[r][q - 1].el + 1
				: ArrayLast(z.rows[r - 1]).el + 1
	}
	this._addTo(this.deep)
	this.showing = 0 // drop last showing to force layout for redo
	this.show(this.layer ? z.layer ? 1 : 2 : this.detail)
	return this
},

_addTo: function (deep)
{
	var u = this.unity, x, w, r, q, d
	u && (u = u.d) != this && this.unityTo(u, true)
	for (x = 0; w = this.bs[x]; x++)
		if (w.zone.deep < deep)
			w.base.as.push(w), w.addTo()
	for (x = 0; w = this.as[x]; x++)
		if (w.zone.deep < deep)
			w.agent.bs.push(w), w.addTo()
	for (x = 0; r = this.rows[x]; x++)
		for (q = 0; d = r[q]; q++)
			d._addTo(deep)
},

// return true if the row is unadd
unadd: function (r, q)
{
	this._unadd(this.deep)
	var z = this.zone, unrow = false
	this.row.splice(q, 1)
	this.io || this.row.length || (z.rows.splice(r, 1), z.ox--, unrow = true)
	if (z.ox == 1 && z.rows[0].length + z.rows[1].length == 0)
		z.rows = [], z.ox = -1
	this.showing = 0, z.show(3)
	var p = this.navPrev, n = this.navNext
	this.edit.now == this && this.edit.Now(p, false)
	p && (p.navNext = n), n && (n.navPrev = p)
	this.navPrev = this.navNext = null
	return unrow
},

_unadd: function (deep)
{
	this.uNext != this && this.unityTo(this, true)
	var x, w, r, q, d
	for (x = 0; w = this.bs[x]; x++)
		if (w.zone.deep < deep)
			ArrayRem(w.base.as, w), w.unadd()
	for (x = 0; w = this.as[x]; x++)
		if (w.zone.deep < deep)
			ArrayRem(w.agent.bs, w), w.unadd()
	for (x = 0; r = this.rows[x]; x++)
		for (q = 0; d = r[q]; q++)
			d._unadd(deep)
},

Name: function (v)
{
	if (v.charCodeAt(0) == 63 || v.charCodeAt(0) == 33) // ? !
		v = v.substr(1)
	for (var d = this.uNext; d != this; d = d.uNext)
		if (v)
			d._Name(v)
		else
			throw 'empty unity name'
	this._Name(v)
},

_Name: function (v)
{
	this.name = v
	v = (this.tv ? this.edit.nameTvW : 0) + (v ? this.edit.draw.measureText(v).width | 0 : 0)
	this.nameR = v && (v + 6), this.nameH = v && (this.edit.nameH + 5)
	this.show(-1)
},

toString: function ()
{
	return "'" + this.name + "'"
},

Tv: function (tv)
{
	var tv0 = this.tv
	if (tv0 == tv)
		return
	this.tv = tv
	!tv0 != !tv && this._Name(this.name)
},

// replace is true by default, return exist
agent: function (w, a, replace)
{
	if (replace !== false)
		for (var x = this.as.length - 1, w0; w0 = this.as[x]; x--)
			if (w0.agent == a)
			{
				this.as[x] = w, a.bs[a.bs.indexOf(w0)] = w,
				w0.unadd(), w.zone ? w.addTo() : w.addTo(this, a)
				return w0
			}
	this.as.push(w), a.bs.push(w)
	w.zone ? w.addTo() : w.addTo(this, a)
	return null
},

unagent: function (w)
{
	var x = this.as.indexOf(w), a = w.agent
	if (x < 0)
		return
	this.as.splice(x, 1), ArrayRem(a.bs, w)
	w.unadd()
},

breakRow: function (r, x)
{
	var r0 = this.rows[r], r1 = Row(this, r0.splice(x)), d
	this.rows.splice(r + 1, 0, r1)
	for (d = r1.length - 1; d >= 0; d--)
		r1[d].row = r1
	this.ox++
	this.show(3)
},

// return the length before merge
mergeRow: function (r)
{
	var r0 = this.rows[r], r1 = this.rows.splice(r + 1, 1)
	if (r1 == null)
		return -1
	var n0 = r0.length, r1 = r1[0]
	r0.push.apply(r0, r1)
	for (d = r1.length - 1; d >= 0; d--)
		r1[d].row = r0
	this.ox--
	this.show(3)
	return n0
},

unityTo: function (u, undoRedo)
{
	if (this.io != u.io || !u.io)
		throw 'must be input or output both'
	if (this.unity.d == this)
		this.unity.d = this.uNext
	if ( !undoRedo)
		if (u == this)
			(this.unity = new String(++Unity)).d = this
		else if (this.unity == u.unity)
			return
	this.uNext.uPrev = this.uPrev
	this.uPrev.uNext = this.uNext
	this.uNext = u.uNext
	this.uPrev = u
	u.uNext = this
	this.uNext.uPrev = this
	if (u != this)
	{
		if (u.name)
			this.Name(u.name)
		else if (this.name)
			u.Name(this.name)
		else
			throw 'unity must have name'
		this.unity = u.unity
	}
},

////////////////////////////////      ////////////////////////////////
//////////////////////////////// view ////////////////////////////////
////////////////////////////////      ////////////////////////////////

layoutDetail: function ()
{
	var dd = this.showing, r, x, y, d
	if (dd >= 4 || !this.zone)
		this.detail = 3
	else if (dd > 0)
		this.detail = dd < 2 && this.edit.now == this ? 2 : dd
	for (x = 0; x <= this.ox; x++)
		for (r = this.rows[x], y = 0; d = r[y]; y++)
		{
			if (dd > 0)
				if (dd >= 4 && !d.layer)
					d.showing = 4
				else if (dd <= 2)
					d.showing = 1
			d.layoutDetail()
			if (d.detail >= 2 && this.detail < 3)
				this.detail = this.showing = 3
		}
	if (this.detail >= 3)
		for (x = 0; x <= this.ox; x++)
			for (r = this.rows[x], y = 0; d = r[y]; y++)
				if (d.detail < 2)
					d.detail = d.showing = 2
},

layout: function (force)
{
	var rs = this.rows, ws = this.wires, r, x, y, d, w, h, w2, h2
	for (x = 0; r = rs[x]; x++)
		for (y = 0; d = r[y]; y++)
			d.layout(false) && (force = true)
	this.showing && (force = true, this.showing = 0)
	if ( !force)
	{
		for (x = 0; w = ws[x]; x++)
			w.layout(false)
		return false
	}
	if (this.detail <= 1)
	{
		for (x = 0; r = rs[x]; x++)
			r.layout(0, 0, 0, 0)
		for (x = 0; w = ws[x]; x++)
			w.layout(true)
		this.w = this.h = 0
		return true
	}
	var nr = this.nameR, nh = this.nameH
	if (this.ox < 0)
	{
		this.w = Math.max(SIZE0, nr)
		this.h = Math.max(SIZE0, nh)
		this.nameY = 2
	}
	else if (this.detail == 2)
	{
		this.w = Math.max(SIZE0, nr)
		this.h = Math.max(SIZE0, nh + 6)
		this.nameY = 2
		w2 = this.w >> 1, h2 = nh || this.h >> 1
		rs[0].layout(0, w2, w2, 0)
		for (x = 1; r = rs[x]; x++)
			r.layout(0, w2, w2, h2)
		for (x = 0; w = ws[x]; x++)
			w.layout(true)
	}
	else
	{
		r = rs[0]
		if (r.length && nr > NAME_WIDTH)
			w = Math.max(SIZE0, nr, r.layoutW())
		else
			w = Math.max(SIZE0, nr + r.layoutW())
		for (x = 1; r = rs[x]; x++)
			w = Math.max(w, r.layoutW())
		r = rs[0]
		if (r.length && nr > NAME_WIDTH)
			r.layout(1, 0, w, 0),
			h = r.h + 3
		else
			r.layout(1, nr, w, 0),
			h = 0
		this.nameY = h + 2
		h = Math.max(h + nh, r.h + SPACE)
		for (x = 1; r = rs[x]; x++)
			r.layout(x < this.ox ? 2 : 3, 0, w, h),
			h += x < this.ox ? r.h + SPACE : r.h
		this.w = w, this.h = h
		for (x = 0; w = ws[x]; x++)
			w.layout(true)
	}
	return true
},

// 0: no show, <0: show, 1: hide, 2: show only this
// 3: show this and inners, >=4: show all deeply
show: function (x)
{
	if (this.showing <= 0 || x > this.showing)
		this.showing = x, this.edit.show(true)
	return true
},

// X Y W H is draw area based on this datum
_show: function (draw, X, Y, W, H)
{
	var w = this.w, h = this.h
	if (X >= w || Y >= h || X + W <= 0 || Y + H <= 0 || !w)
		return
	draw.translate(-X, -Y)

	var edit = this.edit, io = this.io, s = this.rows, R, r, D, d, x, y, rh, dw, dh

//fill background
//	var bc = io < 0 ? '#f9f3ff' : io > 0 ? '#f3f9ff' : '#f5fff5'
//  draw.fillStyle = bc
//	if (this.detail > 2 && this.ox > 0)
//		for (R = this.searchRow(Y), R ^= R >> 31, y = 0; (r = s[R]) && y < Y + H; R++)
//		{
//			draw.fillRect(0, y, w, -y + (y = r.y))
//			rh = r.h
//			D = r.searchDatumX(X), D ^= D >> 31
//			for (x = 0; (d = r[D]) && x < X + W; D++)
//				draw.fillRect(x, y, -x + (x = d.x), rh),
//				draw.fillRect(x, y, dw = d.w, d.y - y),
//				draw.fillRect(x, h = d.y + (dh = d.h), dw, rh - dh),
//				x += dw
//			D && (d = r[D - 1], draw.fillRect(dw = d.x + d.w, y, w - dw, rh))
//			y += rh
//		}
//	else
//		draw.fillRect(0, 0, w, h)

	var c = this.err ? '#f00' : io < 0 ? '#90c' : io > 0 ? '#06d' : '#080'
	draw.strokeStyle = c
	draw.lineWidth = this.yield ? 0.5 : 1, draw.strokeRect(0.5, 0.5, w - 1, h - 1)
	if (this.gene)
		draw.fillStyle = c, draw.beginPath(),
		draw.moveTo(1, 1), draw.lineTo(4, 1), draw.lineTo(1, 6), draw.fill()
	if (this.yield)
		draw.fillStyle = c, draw.beginPath(),
		draw.moveTo(0, 0), draw.lineTo(-3, 0), draw.lineTo(0, 6), draw.fill()
	if (this.detail == 2 && this.ox > 0)
		draw.lineWidth = 2, draw.strokeRect((w >> 1) - 3, this.nameH || h >> 1, 6, 0)

	if (this.uNext != this && this.unity == edit.nav.unity)
		draw.fillStyle = io < 0 ? '#ecf' : '#cce3ff',
		draw.fillRect(2, this.nameY, this.nameR - 4, edit.nameH + 1)
	if (D = this.tv)
		draw.fillStyle = '#000', draw.fillText(D < 0 ? '?' : '!', 3, this.nameY + edit.nameH)
	if (d = this.name)
		draw.fillStyle = '#000', draw.fillText(d, (D && edit.nameTvW) + 3, this.nameY + edit.nameH)

	draw.translate(X, Y)
	for (R = 0; r = s[R]; R++)
		if (Y - r.y < r.h && Y + H > r.y)
			for (D = 0; d = r[D]; D++)
				d._show(draw, X - d.x, Y - d.y, W, H)
	if (this == edit.hit && (this != edit.now || edit.drag))
		draw.translate(-X, -Y),
		draw.strokeStyle = this.err ? '#f66' : io < 0 ? '#d8f' : io > 0 ? '#8bf' : '#7d7',
		draw.lineWidth = this.yield ? 1 : 2, draw.strokeRect(-0.5, -0.5, w + 1, h + 1),
		draw.translate(X, Y)
	else if (this == edit.now)
		draw.translate(-X, -Y), draw.strokeStyle = c,
		draw.lineWidth = this.yield ? 1 : 2, draw.strokeRect(-0.5, -0.5, w + 1, h + 1),
		draw.translate(X, Y)

//	if (err)
//		edit.tip.str(err).color(0xfff8f8, 0xaa6666, 0x880000)
//			.xy(stage.mouseX + 1, stage.mouseY - edit.tip.height).visible = true
//	else
//		edit.tip.str('').visible = false	
	if (this.detail >= 3)
		for (s = this.wires, x = 0; s[x]; x++)
			s[x].show(draw, X, Y, W, H)
},

hit: function (xy, wire)
{
	var d = this, x = xy[0] - d.x, y = xy[1] - d.y, i, n, w, r
	if (x < 0 || y < 0 || x >= this.w || y >= this.h)
		return null
	xy[0] = d.x, xy[1] = d.y
	for (;;)
	{
		if (wire !== false && d.detail >= 3)
			for (i = 0; w = d.wires[i]; i++)
				if (w.hit(x, y))
					return xy[0] += w.x, xy[1] += w.y, w
		if ((i = d.searchRow(y)) < 0)
			break
		r = d.rows[i]
		i = r.searchDatum(x, y)
		if (i < 0)
			break
		d = r[i]
		x -= d.x, y -= d.y
		xy[0] += d.x, xy[1] += d.y
	}
	return d
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

searchRow: function (y)
{
	if (y < 0)
		return -1
	var low = 0, high = this.ox, s = this.rows
	while (low <= high)
	{
		var mid = low + high >>> 1, r = s[mid]
		if (y < r.y)
			high = mid - 1
		else if (y >= r.y + r.h)
			low = mid + 1
		else
			return mid
	}
	return ~low
},

////////////////////////////////      ////////////////////////////////
//////////////////////////////// edit ////////////////////////////////
////////////////////////////////      ////////////////////////////////

}

})()