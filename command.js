//
// Qutum 10 implementation
// Copyright 2008-2013 Qianyan Cai
// Under the terms of the GNU General Public License version 3
// http://qutum.com
//
(function(){

Command = function (edit)
{
	this.edit = edit
	this.redos = []
	this.undos = []
}
//var UNDOn = 301

Command.prototype =
{

edit: null,
redos: null, // [ function ]
undos: null, // [ function ]
x: 0, // next command index, <= redos/undos.length

go: function (redo, undo)
{
	redo.call(this)
	this.redos[this.x] = redo
	this.undos[this.x] = undo
	this.redos.length = this.undos.length = ++this.x
	this.edit.Unsave(1)
},

redo: function (test)
{
	if ( !this.redos[this.x]) return 'nothing to redo'
	if (this.edit.drag) return 'not available under dragging'
	if (test) return
	this.redos[this.x++].call(this)
	this.edit.Unsave(1)
},

undo: function (test)
{
	if ( !this.x) return 'nothing to undo'
	if (this.edit.drag) return 'not available under dragging'
	if (test) return
	this.undos[--this.x].call(this)
	this.edit.Unsave(-1)
},

Name: function (v, test)
{
	var now = this.edit.now, m = now.name
	var c0 = v.charCodeAt(0)
	if (c0 == 63 || c0 == 33) // ? !
		v = v.substr(1)
	if ( !now.deep) return 'must be datum'
	if (m == v) return 'no change'
	if (now.layer || now.nk < 0) return 'can not change layer 2'
	if ( !v && now.yield) return 'can not change yield'
	var d = now.nNonyield()
	if ( !d) return 'can not change yield'
	if (test) return
	var n = v && m || d.nNext.nNonyield()
	this.go(function ()
	{
		v || d.io == 0 || d.namesakeTo(d), d.Name(v)
		now.edit || (now = d)
		this.edit.Now(now)
	},
	function ()
	{
		v && m || d.io == 0 || d.namesakeTo(n), d.Name(m)
		now.edit || (now = d)
		this.edit.Now(now)
	})
},

input: function (inner, test)
{
	var now = this.edit.now, z = !inner && now.zone || now
	if ( !now.deep) return 'must be datum'
	if (z.layer) return 'can not change layer 2'
	if (z.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available under dragging'
	if (test) return
	var d = new Datum(-1), R, D
	if (z == now || now.io >= 0 || now.layer)
		R = 0, D = z.or < 0 ? 0 : z.rows[R].length
	else
		R = z.rows.indexOf(now.row), D = now.row.indexOf(now) + 1
	while (D > 0 && z.rows[R][D - 1].yield)
		D--
	this.go(function ()
	{
		d.addTo(z, R, D), this.edit.Now(d)
	},
	function ()
	{
		d.unadd(R, D), this.edit.Now(now)
	})
},

hub: function (inner, test)
{
	var now = this.edit.now, z = !inner && now.zone || now
	if ( !now.deep) return 'must be datum'
	if (z.layer) return 'can not change layer 2'
	if (z.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	var d = new Datum(0), R, D
	if (z == now || now.io)
		z.or <= 1 ? (R = 1, D = -1) : (R = z.or - 1, D = z.rows[R].length),
		D >= 4 && (R++, D = -1)
	else
		R = z.rows.indexOf(now.row), D = now.row.indexOf(now) + 1
	this.go(function ()
	{
		d.addTo(z, R, D), this.edit.Now(d)
	},
	function ()
	{
		d.unadd(R, D < 0 ? 0 : D), this.edit.Now(now)
	})
},

output: function (inner, test)
{
	var now = this.edit.now, z = !inner && now.zone || now
	if ( !now.deep) return 'must be datum'
	if (z.layer) return 'can not change layer 2'
	if (z.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	var d = new Datum(1), R, D
	if (z == now || now.io <= 0 || now.layer)
		R = z.or < 0 ? 1 : z.or, D = z.or < 0 ? 0 : z.rows[R].length
	else
		R = z.rows.indexOf(now.row), D = now.row.indexOf(now) + 1
	while (D > 0 && z.rows[R][D - 1].yield)
		D--
	this.go(function ()
	{
		d.addTo(z, R, D), this.edit.Now(d)
	},
	function ()
	{
		d.unadd(R, D), this.edit.Now(now)
	})
},


early: function (d, test)
{
	var now = this.edit.now, z = now.zone
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (test && !d) return
	if (d == now) return 'no change'
	if ( !d.deep) return 'must be datum'
	if (d.zone != z) return 'must be same zone'
	if (d.io != now.io) return now.io < 0 ? 'must be input' : now.io > 0 ? 'must be output'
		: 'must be hub'
	if (d.layer) return 'can not change layer 2'
	var rs = z.rows, R = rs.indexOf(d.row), D = d.row.indexOf(d)
	if (D >= 1)
		if (d.row[D - 1].yield) return 'can not change yield'
		else if (d.row[D - 1] == now) return 'no change'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var R0 = rs.indexOf(now.row), D0 = now.row.indexOf(now)
	var unrow = R != R0 && now.row.length == 1
	R == R0 && D > D0 && D--, d = null
	this.go(function ()
	{
		rs[R0].splice(D0, 1), rs[R].splice(D, 0, now), now.row = rs[R]
		unrow && (z.or--, rs.splice(R0, 1))
		z.show(-1), this.edit.Now(now)
	},
	function ()
	{
		unrow && (z.or++, rs.splice(R0, 0, Row(z, [])))
		rs[R].splice(D, 1), rs[R0].splice(D0, 0, now), now.row = rs[R0]
		z.show(-1), this.edit.Now(now)
	})
},

later: function (d, test)
{
	var now = this.edit.now, z = now.zone
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (test && !d) return
	if (d == now) return 'no change'
	if ( !d.deep) return 'must be datum'
	if (d.zone != z) return 'must be same zone'
	if (d.io != now.io) return now.io < 0 ? 'must be input' : now.io > 0 ? 'must be output'
		: 'must be hub'
	if (d.layer) return 'can not change layer 2'
	if (d.yield) return 'can not change yield'
	var rs = z.rows, R = rs.indexOf(d.row), D = d.row.indexOf(d) + 1
	if (d.row[D] == now) return 'no change'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var R0 = rs.indexOf(now.row), D0 = now.row.indexOf(now)
	var unrow = R != R0 && rs[R0].length == 1
	R == R0 && D > D0 && D--, d = null
	this.go(function ()
	{
		rs[R0].splice(D0, 1), rs[R].splice(D, 0, now), now.row = rs[R]
		unrow && (z.or--, rs.splice(R0, 1))
		z.show(-1), this.edit.Now(now)
	},
	function ()
	{
		unrow && (z.or++, rs.splice(R0, 0, Row(z, [])))
		rs[R].splice(D, 1), rs[R0].splice(D0, 0, now), now.row = rs[R0]
		z.show(-1), this.edit.Now(now)
	})
},

earlyRow: function (d, test)
{
	var now = this.edit.now, z = now.zone
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (now.io) return 'must be hub'
	if (test && !d) return
	if ( !d.deep) return 'must be datum'
	if ( !(d.io >= 0)) return 'must not be input'
	if (d.zone != z) return 'must be same zone'
	var unrow = now.row.length == 1
	if (unrow && d.row == now.row) return 'no change'
	var rs = z.rows, R = rs.indexOf(d.row)
	if (unrow && rs[R - 1] == now.row) return 'no change'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var R0 = rs.indexOf(now.row), D0 = now.row.indexOf(now)
	unrow && R > R0 && R--, d = null
	this.go(function ()
	{
		if (unrow)
			rs.splice(R, 0, rs.splice(R0, 1)[0])
		else
			z.or++, rs[R0].splice(D0, 1), rs.splice(R, 0, now.row = Row(z, [ now ]))
		z.show(-1), this.edit.Now(now)
	},
	function ()
	{
		if (unrow)
			rs.splice(R0, 0, rs.splice(R, 1)[0])
		else
			z.or--, rs.splice(R, 1), rs[R0].splice(D0, 0, now), now.row = rs[R0]
		z.show(-1), this.edit.Now(now)
	})
},

laterRow: function (d, test)
{
	var now = this.edit.now, z = now.zone
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (now.io) return 'must be hub'
	if (test && !d) return
	if ( !d.deep) return 'must be datum'
	if ( !(d.io <= 0)) return 'must not be output'
	if (d.zone != z) return 'must be same zone'
	var unrow = now.row.length == 1
	if (unrow && d.row == now.row) return 'no change'
	var rs = z.rows, R = rs.indexOf(d.row) + 1
	if (unrow && rs[R] == now.row) return 'no change'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var R0 = rs.indexOf(now.row), D0 = now.row.indexOf(now)
	var unrow = now.row.length == 1
	unrow && R > R0 && R--, d = null
	this.go(function ()
	{
		if (unrow)
			rs.splice(R, 0, rs.splice(R0, 1)[0])
		else
			z.or++, rs[R0].splice(D0, 1), rs.splice(R, 0, now.row = Row(z, [ now ]))
		z.show(-1), this.edit.Now(now)
	},
	function ()
	{
		if (unrow)
			rs.splice(R0, 0, rs.splice(R, 1)[0])
		else
			z.or--, rs.splice(R, 1), rs[R0].splice(D0, 0, now), now.row = rs[R0]
		z.show(-1), this.edit.Now(now)
	})
},

namesake: function (n, test)
{
	var now = this.edit.now, m = now.name
	if ( !now.io) return 'must be input or output'
	if (now.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (test && !n) return
	var nm = n.name
	if (n.io != now.io) return now.io < 0 ? 'must be input' : 'must be output'
	if (n != now && n.nk == now.nk) return 'already be namesake'
	if ( !m && !nm) return 'must have name'
	n = n.nNonyield()
	if ( !n) return 'can not change yield'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var nown = now.nNext.nNonyield()
	this.go(function ()
	{
		now.namesakeTo(n), this.edit.Now(now)
	},
	function ()
	{
		now.namesakeTo(nown), now.Name(m)
		nm || (n.namesakeTo(n), n.Name(nm)) // namesake self if no name
		this.edit.Now(now)
	})
},

base: function (b, test)
{
	return this.edit.now.deep ? this.baseDatum(b, test) : this.baseWire(b, test)
},

usage: function (u, test)
{
	return this.edit.now.deep ? this.usageDatum(u, test) : this.usageWire(u, test)
},

baseDatum: function (b, test)
{
	var now = this.edit.now
	if ( !now.deep) return 'must be datum'
	if (now.zu.zb.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (test && !b) return
	if ( !b.deep) return 'must be datum'
	if (b.zb.zu.layer) return 'can not change layer 2'
	if (b.yield) return 'can not change yield'
	if (b == now) return 'must not be self'
	if (ArrayFind(now.bs, 'base', b) != null) return 'already base'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var w = new Wire, w0
	this.go(function ()
	{
		w0 = b.usage(w, now), this.edit.Now(now)
	},
	function ()
	{
		w0 ? b.usage(w0, now) : b.unusage(w), this.edit.Now(now)
	})
},

usageDatum: function (u, test)
{
	var now = this.edit.now
	if ( !now.deep) return 'must be datum'
	if (now.zb.zu.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (test && !u) return
	if ( !u.deep) return 'must be datum'
	if (u.zu.zb.layer) return 'can not change layer 2'
	if (u.yield) return 'can not change yield'
	if (u == now) return 'must not be self'
	if (ArrayFind(now.us, 'usage', u) != null) return 'already usage'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var w = new Wire, w0
	this.go(function ()
	{
		w0 = now.usage(w, u), this.edit.Now(now)
	},
	function ()
	{
		w0 ? now.usage(w0, u) : now.unusage(w), this.edit.Now(now)
	})
},

baseWire: function (b, test)
{
	var now = this.edit.now
	if (now.deep) return 'must be wire'
	if (now.zone.layer) return 'can not change layer 2'
	if (now.yield || now.usage.yield) return 'can not change yield'
	if (test && !b) return
	if ( !b.deep) return 'must be datum'
	if (b.yield) return 'can not change yield'
	if (b == now.usage) return 'must not be self'
	if (ArrayFind(now.usage.bs, 'base', b) != null) return 'already base'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var w = new Wire, w0
	this.go(function ()
	{
		now.base.unusage(now)
		w0 = b.usage(w, now.usage)
		this.edit.Now(w)
	},
	function ()
	{
		w0 ? b.usage(w0, now.usage) : b.unusage(w)
		now.base.usage(now, now.usage, false)
		this.edit.Now(now)
	})
},

usageWire: function (u, test)
{
	var now = this.edit.now
	if (now.deep) return 'must be wire'
	if (now.zone.layer) return 'can not change layer 2'
	if (now.yield || now.base.yield) return 'can not change yield'
	if (test && !u) return
	if ( !u.deep) return 'must be datum'
	if (u.yield) return 'can not change yield'
	if (u == now.base) return 'must not be self'
	if (ArrayFind(now.base.us, 'usage', u) != null) return 'already base'
	if ( !test && this.edit.drag) return 'not available while dragging'
	if (test) return
	var w = new Wire, w0
	this.go(function ()
	{
		now.base.unusage(now)
		w0 = now.base.usage(w, u)
		this.edit.Now(w)
	},
	function ()
	{
		w0 ? now.base.usage(w0, u) : now.base.unusage(w)
		now.base.usage(now, now.usage, false)
		this.edit.Now(now)
	})
},

trialVeto: function (tv, test)
{
	var now = this.edit.now, tv0 = now.tv
	if ( !now.deep) return 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	tv0 == tv && (tv = 0)
	this.go(function ()
	{
		now.Tv(tv), this.edit.Now(now)
	},
	function ()
	{
		now.Tv(tv0), this.edit.Now(now)
	})
},

nonyield: function (test)
{
	return this.edit.now.deep ? this.nonyieldDatum(test) : this.nonyieldWire(test)
},

nonyieldDatum: function (test)
{
	var now = this.edit.now, z, zz
	if ( !now.yield) return 'must be yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	this.go(function ()
	{
		for (z = now; (zz = z).yield; z = z.zone)
			z.yield = 0, z.show(-1)
		this.edit.Now(now)
	},
	function ()
	{
		for (z = now; z != zz; z = z.zone)
			z.yield = 1, z.show(-1)
		this.edit.Now(now)
	})
},

nonyieldWire: function (test)
{
	var now = this.edit.now, bz, bzz, uz, uzz
	if ( !now.yield) return 'must be yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	this.go(function ()
	{
		now.yield = 0
		for (bz = now.base; (bzz = bz).yield; bz = bz.zone)
			bz.yield = 0, bz.show(-1)
		for (uz = now.usage; (uzz = uz).yield; uz = uz.zone)
			uz.yield = 0, uz.show(-1)
		this.edit.Now(now), now.showing = true, edit.show(true)
	},
	function ()
	{
		now.yield = 1
		for (bz = now.base; bz != bzz; bz = bz.zone)
			bz.yield = 1, bz.show(-1)
		for (uz = now.usage; uz != uzz; uz = uz.zone)
			uz.yield = 1, uz.show(-1)
		this.edit.Now(now), now.showing = true, edit.show(true)
	})
},

breakRow: function (test)
{
	var now = this.edit.now
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.io) return 'must be hub'
	var D = now.row.indexOf(now)
	if (D <= 0) return 'must not be first of row'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	var R = now.zone.rows.indexOf(now.row)
	this.go(function ()
	{
		now.zone.breakRow(R, D), this.edit.Now(now)
	},
	function ()
	{
		now.zone.mergeRow(R), this.edit.Now(now)
	})
},

remove: function (test)
{
	return this.edit.now.deep ? this.removeDatum(test) : this.removeWire(test)
},

removeLeft: function (test)
{
	return this.edit.now.deep ? this.removeLeftDatum(test) : this.removeWire(test)
},

removeRight: function (test)
{
	return this.edit.now.deep ? this.removeRightDatum(test) : this.removeWire(test)
},

removeDatum: function (test)
{
	var now = this.edit.now
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	var z = now.zone, rs = z.rows
	var R = rs.indexOf(now.row), D = now.row.indexOf(now), unrow
	this.go(function ()
	{
		unrow = now.unadd(R, D)
		this.edit.Now(z.or < 0 ? z :
			rs[R][D] || rs[R + 1] && rs[R + 1][0] || rs[R][D - 1] || ArrayLast(rs[R - 1]))
	},
	function ()
	{
		now.addTo(z, R, unrow ? -1 : D), this.edit.Now(now)
	})
},

removeLeftDatum: function (test)
{
	var now = this.edit.now
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	var z = now.zone, R = z.rows.indexOf(now.row), D = now.row.indexOf(now)
	if (R > 1 && R < z.or && D == 0)
	{
		if (this.edit.drag) return 'not available while dragging'
		if (test) return
		this.go(function ()
		{
			D = z.mergeRow(R - 1), this.edit.Now(now)
		},
		function ()
		{
			z.breakRow(R - 1, D), this.edit.Now(now)
		})
	}
	else
	{
		var d = now.row[D - 1]
		if ( !d) return 'no change'
		if (d.layer) return 'can not change layer 2'
		if (d.yield) return 'can not change yield'
		if (this.edit.drag) return 'not available while dragging'
		if (test) return
		this.go(function ()
		{
			d.unadd(R, D - 1), this.edit.Now(now)
		},
		function ()
		{
			d.addTo(z, R, D - 1), this.edit.Now(now)
		})
	}
},

removeRightDatum: function (test)
{
	var now = this.edit.now
	if ( !now.row) return now.deep ? 'must not be zonest' : 'must be datum'
	if (now.layer) return 'can not change layer 2'
	var z = now.zone, R = z.rows.indexOf(now.row), D = now.row.indexOf(now)
	if (R > 0 && R < z.or - 1 && D == now.row.length - 1)
	{
		if (this.edit.drag) return 'not available while dragging'
		if (test) return
		this.go(function ()
		{
			D = z.mergeRow(R), this.edit.Now(now)
		},
		function ()
		{
			z.breakRow(R, D), this.edit.Now(now)
		})
	}
	else
	{
		var d = z.rows[R][D + 1]
		if ( !d) return 'no change'
		if (d.layer) return 'can not change layer 2'
		if (d.yield) return 'can not change yield'
		if (this.edit.drag) return 'not available while dragging'
		if (test) return
		this.go(function ()
		{
			d.unadd(R, D + 1), this.edit.Now(now)
		},
		function ()
		{
			d.addTo(z, R, D + 1), this.edit.Now(now)
		})
	}
},

removeWire: function (test)
{
	var now = this.edit.now
	if (now.deep) return 'must be wire'
	if (now.zone.layer) return 'can not change layer 2'
	if (now.yield) return 'can not change yield'
	if (this.edit.drag) return 'not available while dragging'
	if (test) return
	this.go(function ()
	{
		this.edit.Now(now.keyPrev || now.usage)
		now.base.unusage(now)
	},
	function ()
	{
		now.base.usage(now, now.usage, false)
		this.edit.Now(now)
	})
},

}

})()
