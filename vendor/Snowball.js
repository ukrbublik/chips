/*!
 * Snowball JavaScript Library v0.3
 * http://code.google.com/p/urim/
 * http://snowball.tartarus.org/
 *
 * Copyright 2010, Oleg Mazko
 * http://www.mozilla.org/MPL/
 */

function Snowball(lng) {
	function Among(s, substring_i, result, method) {
		this.s_size = s.length;
		this.s = this.toCharArray(s);
		this.substring_i = substring_i;
		this.result = result;
		this.method = method;
	}
	Among.prototype.toCharArray = function(s) {
		var sLength = s.length, charArr = new Array(sLength);
		for (var i = 0; i < sLength; i++)
			charArr[i] = s.charCodeAt(i);
		return charArr;
	}
	function SnowballProgram() {
		var current;
		return {
			b : 0,
			k : 0,
			l : 0,
			c : 0,
			lb : 0,
			s_c : function(word) {
				current = word;
				this.c = 0;
				this.l = word.length;
				this.lb = 0;
				this.b = this.c;
				this.k = this.l;
			},
			g_c : function() {
				var result = current;
				current = null;
				return result;
			},
			i_g : function(s, min, max) {
				if (this.c < this.l) {
					var ch = current.charCodeAt(this.c);
					if (ch <= max && ch >= min) {
						ch -= min;
						if (s[ch >> 3] & (0X1 << (ch & 0X7))) {
							this.c++;
							return true;
						}
					}
				}
				return false;
			},
			i_g_b : function(s, min, max) {
				if (this.c > this.lb) {
					var ch = current.charCodeAt(this.c - 1);
					if (ch <= max && ch >= min) {
						ch -= min;
						if (s[ch >> 3] & (0X1 << (ch & 0X7))) {
							this.c--;
							return true;
						}
					}
				}
				return false;
			},
			o_g : function(s, min, max) {
				if (this.c < this.l) {
					var ch = current.charCodeAt(this.c);
					if (ch > max || ch < min) {
						this.c++;
						return true;
					}
					ch -= min;
					if (!(s[ch >> 3] & (0X1 << (ch & 0X7)))) {
						this.c++;
						return true;
					}
				}
				return false;
			},
			o_g_b : function(s, min, max) {
				if (this.c > this.lb) {
					var ch = current.charCodeAt(this.c - 1);
					if (ch > max || ch < min) {
						this.c--;
						return true;
					}
					ch -= min;
					if (!(s[ch >> 3] & (0X1 << (ch & 0X7)))) {
						this.c--;
						return true;
					}
				}
				return false;
			},
			e_s : function(s_size, s) {
				if (this.l - this.c < s_size)
					return false;
				for (var i = 0; i < s_size; i++)
					if (current.charCodeAt(this.c + i) != s.charCodeAt(i))
						return false;
				this.c += s_size;
				return true;
			},
			e_s_b : function(s_size, s) {
				if (this.c - this.lb < s_size)
					return false;
				for (var i = 0; i < s_size; i++)
					if (current.charCodeAt(this.c - s_size + i) != s
							.charCodeAt(i))
						return false;
				this.c -= s_size;
				return true;
			},
			f_a : function(v, v_size) {
				var i = 0, j = v_size, c = this.c, l = this.l, common_i = 0, common_j = 0, first_key_inspected = false;
				while (true) {
					var k = i + ((j - i) >> 1), diff = 0, common = common_i < common_j
							? common_i
							: common_j, w = v[k];
					for (var i2 = common; i2 < w.s_size; i2++) {
						if (c + common == l) {
							diff = -1;
							break;
						}
						diff = current.charCodeAt(c + common) - w.s[i2];
						if (diff)
							break;
						common++;
					}
					if (diff < 0) {
						j = k;
						common_j = common;
					} else {
						i = k;
						common_i = common;
					}
					if (j - i <= 1) {
						if (i > 0 || j == i || first_key_inspected)
							break;
						first_key_inspected = true;
					}
				}
				while (true) {
					var w = v[i];
					if (common_i >= w.s_size) {
						this.c = c + w.s_size;
						if (!w.method)
							return w.result;
						var res = w.method();
						this.c = c + w.s_size;
						if (res)
							return w.result;
					}
					i = w.substring_i;
					if (i < 0)
						return 0;
				}
			},
			f_a_b : function(v, v_size) {
				var i = 0, j = v_size, c = this.c, lb = this.lb, common_i = 0, common_j = 0, first_key_inspected = false;
				while (true) {
					var k = i + ((j - i) >> 1), diff = 0, common = common_i < common_j
							? common_i
							: common_j, w = v[k];
					for (var i2 = w.s_size - 1 - common; i2 >= 0; i2--) {
						if (c - common == lb) {
							diff = -1;
							break;
						}
						diff = current.charCodeAt(c - 1 - common) - w.s[i2];
						if (diff)
							break;
						common++;
					}
					if (diff < 0) {
						j = k;
						common_j = common;
					} else {
						i = k;
						common_i = common;
					}
					if (j - i <= 1) {
						if (i > 0 || j == i || first_key_inspected)
							break;
						first_key_inspected = true;
					}
				}
				while (true) {
					var w = v[i];
					if (common_i >= w.s_size) {
						this.c = c - w.s_size;
						if (!w.method)
							return w.result;
						var res = w.method();
						this.c = c - w.s_size;
						if (res)
							return w.result;
					}
					i = w.substring_i;
					if (i < 0)
						return 0;
				}
			},
			r_s : function(c_bra, c_ket, s) {
				var adjustment = s.length - (c_ket - c_bra), left = current
						.substring(0, c_bra), right = current.substring(c_ket);
				current = left + s + right;
				this.l += adjustment;
				if (this.c >= c_ket)
					this.c += adjustment;
				else if (this.c > c_bra)
					this.c = c_bra;
				return adjustment;
			},
			s_ch : function() {
				if (this.b < 0 || this.b > this.k || this.k > this.l
						|| this.l > current.length)
					throw ("faulty slice operation");
			},
			s_f : function(s) {
				this.s_ch();
				this.r_s(this.b, this.k, s);
			},
			s_d : function() {
				this.s_f("");
			},
			i_ : function(c_bra, c_ket, s) {
				var adjustment = this.r_s(c_bra, c_ket, s);
				if (c_bra <= this.b)
					this.b += adjustment;
				if (c_bra <= this.k)
					this.k += adjustment;
			},
			s_t : function() {
				this.s_ch();
				return current.substring(this.b, this.k);
			},
			e_v_b : function(s) {
				return this.e_s_b(s.length, s);
			}
		};
	}
	var stemFactory = {
		EnglishStemmer : function() {
			var a_0 = [new Among("arsen", -1, -1), new Among("commun", -1, -1),
					new Among("gener", -1, -1)], a_1 = [new Among("'", -1, 1),
					new Among("'s'", 0, 1), new Among("'s", -1, 1)], a_2 = [
					new Among("ied", -1, 2), new Among("s", -1, 3),
					new Among("ies", 1, 2), new Among("sses", 1, 1),
					new Among("ss", 1, -1), new Among("us", 1, -1)], a_3 = [
					new Among("", -1, 3), new Among("bb", 0, 2),
					new Among("dd", 0, 2), new Among("ff", 0, 2),
					new Among("gg", 0, 2), new Among("bl", 0, 1),
					new Among("mm", 0, 2), new Among("nn", 0, 2),
					new Among("pp", 0, 2), new Among("rr", 0, 2),
					new Among("at", 0, 1), new Among("tt", 0, 2),
					new Among("iz", 0, 1)], a_4 = [new Among("ed", -1, 2),
					new Among("eed", 0, 1), new Among("ing", -1, 2),
					new Among("edly", -1, 2), new Among("eedly", 3, 1),
					new Among("ingly", -1, 2)], a_5 = [
					new Among("anci", -1, 3), new Among("enci", -1, 2),
					new Among("ogi", -1, 13), new Among("li", -1, 16),
					new Among("bli", 3, 12), new Among("abli", 4, 4),
					new Among("alli", 3, 8), new Among("fulli", 3, 14),
					new Among("lessli", 3, 15), new Among("ousli", 3, 10),
					new Among("entli", 3, 5), new Among("aliti", -1, 8),
					new Among("biliti", -1, 12), new Among("iviti", -1, 11),
					new Among("tional", -1, 1), new Among("ational", 14, 7),
					new Among("alism", -1, 8), new Among("ation", -1, 7),
					new Among("ization", 17, 6), new Among("izer", -1, 6),
					new Among("ator", -1, 7), new Among("iveness", -1, 11),
					new Among("fulness", -1, 9), new Among("ousness", -1, 10)], a_6 = [
					new Among("icate", -1, 4), new Among("ative", -1, 6),
					new Among("alize", -1, 3), new Among("iciti", -1, 4),
					new Among("ical", -1, 4), new Among("tional", -1, 1),
					new Among("ational", 5, 2), new Among("ful", -1, 5),
					new Among("ness", -1, 5)], a_7 = [new Among("ic", -1, 1),
					new Among("ance", -1, 1), new Among("ence", -1, 1),
					new Among("able", -1, 1), new Among("ible", -1, 1),
					new Among("ate", -1, 1), new Among("ive", -1, 1),
					new Among("ize", -1, 1), new Among("iti", -1, 1),
					new Among("al", -1, 1), new Among("ism", -1, 1),
					new Among("ion", -1, 2), new Among("er", -1, 1),
					new Among("ous", -1, 1), new Among("ant", -1, 1),
					new Among("ent", -1, 1), new Among("ment", 15, 1),
					new Among("ement", 16, 1)], a_8 = [new Among("e", -1, 1),
					new Among("l", -1, 2)], a_9 = [
					new Among("succeed", -1, -1), new Among("proceed", -1, -1),
					new Among("exceed", -1, -1), new Among("canning", -1, -1),
					new Among("inning", -1, -1), new Among("earring", -1, -1),
					new Among("herring", -1, -1), new Among("outing", -1, -1)], a_10 = [
					new Among("andes", -1, -1), new Among("atlas", -1, -1),
					new Among("bias", -1, -1), new Among("cosmos", -1, -1),
					new Among("dying", -1, 3), new Among("early", -1, 9),
					new Among("gently", -1, 7), new Among("howe", -1, -1),
					new Among("idly", -1, 6), new Among("lying", -1, 4),
					new Among("news", -1, -1), new Among("only", -1, 10),
					new Among("singly", -1, 11), new Among("skies", -1, 2),
					new Among("skis", -1, 1), new Among("sky", -1, -1),
					new Among("tying", -1, 5), new Among("ugly", -1, 8)], g_v = [
					17, 65, 16, 1], g_v_WXY = [1, 17, 65, 208, 1], g_valid_LI = [
					55, 141, 2], B_Y_found, I_p2, I_p1, habr = [r_Step_1b,
					r_Step_1c, r_Step_2, r_Step_3, r_Step_4, r_Step_5], sbp = new SnowballProgram();
			this.setCurrent = function(word) {
				sbp.s_c(word);
			};
			this.getCurrent = function() {
				return sbp.g_c();
			};
			function r_prelude() {
				var v_1 = sbp.c, v_2;
				B_Y_found = false;
				sbp.b = sbp.c;
				if (sbp.e_s(1, "'")) {
					sbp.k = sbp.c;
					sbp.s_d();
				}
				sbp.c = v_1;
				sbp.b = v_1;
				if (sbp.e_s(1, "y")) {
					sbp.k = sbp.c;
					sbp.s_f("Y");
					B_Y_found = true;
				}
				sbp.c = v_1;
				while (true) {
					v_2 = sbp.c;
					if (sbp.i_g(g_v, 97, 121)) {
						sbp.b = sbp.c;
						if (sbp.e_s(1, "y")) {
							sbp.k = sbp.c;
							sbp.c = v_2;
							sbp.s_f("Y");
							B_Y_found = true;
							continue;
						}
					}
					if (v_2 >= sbp.l) {
						sbp.c = v_1;
						return;
					}
					sbp.c = v_2 + 1;
				}
			}
			function r_mark_regions() {
				var v_1 = sbp.c;
				I_p1 = sbp.l;
				I_p2 = I_p1;
				if (!sbp.f_a(a_0, 3)) {
					sbp.c = v_1;
					if (habr1()) {
						sbp.c = v_1;
						return;
					}
				}
				I_p1 = sbp.c;
				if (!habr1())
					I_p2 = sbp.c;
			}
			function habr1() {
				while (!sbp.i_g(g_v, 97, 121)) {
					if (sbp.c >= sbp.l)
						return true;
					sbp.c++;
				}
				while (!sbp.o_g(g_v, 97, 121)) {
					if (sbp.c >= sbp.l)
						return true;
					sbp.c++;
				}
				return false;
			}
			function r_shortv() {
				var v_1 = sbp.l - sbp.c;
				if (!(sbp.o_g_b(g_v_WXY, 89, 121)
						&& sbp.i_g_b(g_v, 97, 121) && sbp.o_g_b(g_v, 97, 121))) {
					sbp.c = sbp.l - v_1;
					if (!sbp.o_g_b(g_v, 97, 121)
							|| !sbp.i_g_b(g_v, 97, 121)
							|| sbp.c > sbp.lb)
						return false;
				}
				return true;
			}
			function r_R1() {
				return I_p1 <= sbp.c;
			}
			function r_R2() {
				return I_p2 <= sbp.c;
			}
			function r_Step_1a() {
				var a_v, v_1 = sbp.l - sbp.c;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_1, 3);
				if (a_v) {
					sbp.b = sbp.c;
					if (a_v == 1)
						sbp.s_d();
				} else
					sbp.c = sbp.l - v_1;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_2, 6);
				if (a_v) {
					sbp.b = sbp.c;
					switch (a_v) {
						case 1 :
							sbp.s_f("ss");
							break;
						case 2 :
							var c = sbp.c - 2;
							if (sbp.lb > c || c > sbp.l) {
								sbp.s_f("ie");
								break;
							}
							sbp.c = c;
							sbp.s_f("i");
							break;
						case 3 :
							do {
								if (sbp.c <= sbp.lb)
									return;
								sbp.c--;
							} while (!sbp.i_g_b(g_v, 97, 121));
							sbp.s_d();
							break;
					}
				}
			}
			function r_Step_1b() {
				var a_v, v_1, v_3, v_4;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_4, 6);
				if (a_v) {
					sbp.b = sbp.c;
					switch (a_v) {
						case 1 :
							if (r_R1())
								sbp.s_f("ee");
							break;
						case 2 :
							v_1 = sbp.l - sbp.c;
							while (!sbp.i_g_b(g_v, 97, 121)) {
								if (sbp.c <= sbp.lb)
									return;
								sbp.c--;
							}
							sbp.c = sbp.l - v_1;
							sbp.s_d();
							v_3 = sbp.l - sbp.c;
							a_v = sbp.f_a_b(a_3, 13);
							if (a_v) {
								sbp.c = sbp.l - v_3;
								switch (a_v) {
									case 1 :
										var c = sbp.c;
										sbp.i_(sbp.c, sbp.c, "e");
										sbp.c = c;
										break;
									case 2 :
										sbp.k = sbp.c;
										if (sbp.c > sbp.lb) {
											sbp.c--;
											sbp.b = sbp.c;
											sbp.s_d();
										}
										break;
									case 3 :
										if (sbp.c == I_p1) {
											v_4 = sbp.l - sbp.c;
											if (r_shortv()) {
												sbp.c = sbp.l - v_4;
												var c = sbp.c;
												sbp.i_(sbp.c, sbp.c, "e");
												sbp.c = c;
											}
										}
										break;
								}
							}
							break;
					}
				}
			}
			function r_Step_1c() {
				var v_1 = sbp.l - sbp.c;
				sbp.k = sbp.c;
				if (!sbp.e_s_b(1, "y")) {
					sbp.c = sbp.l - v_1;
					if (!sbp.e_s_b(1, "Y"))
						return;
				}
				sbp.b = sbp.c;
				if (sbp.o_g_b(g_v, 97, 121) && sbp.c > sbp.lb)
					sbp.s_f("i");
			}
			function r_Step_2() {
				var a_v;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_5, 24);
				if (a_v) {
					sbp.b = sbp.c;
					if (r_R1()) {
						switch (a_v) {
							case 1 :
								sbp.s_f("tion");
								break;
							case 2 :
								sbp.s_f("ence");
								break;
							case 3 :
								sbp.s_f("ance");
								break;
							case 4 :
								sbp.s_f("able");
								break;
							case 5 :
								sbp.s_f("ent");
								break;
							case 6 :
								sbp.s_f("ize");
								break;
							case 7 :
								sbp.s_f("ate");
								break;
							case 8 :
								sbp.s_f("al");
								break;
							case 9 :
								sbp.s_f("ful");
								break;
							case 10 :
								sbp.s_f("ous");
								break;
							case 11 :
								sbp.s_f("ive");
								break;
							case 12 :
								sbp.s_f("ble");
								break;
							case 13 :
								if (sbp.e_s_b(1, "l"))
									sbp.s_f("og");
								break;
							case 14 :
								sbp.s_f("ful");
								break;
							case 15 :
								sbp.s_f("less");
								break;
							case 16 :
								if (sbp.i_g_b(g_valid_LI, 99, 116))
									sbp.s_d();
								break;
						}
					}
				}
			}
			function r_Step_3() {
				var a_v;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_6, 9);
				if (a_v) {
					sbp.b = sbp.c;
					if (r_R1()) {
						switch (a_v) {
							case 1 :
								sbp.s_f("tion");
								break;
							case 2 :
								sbp.s_f("ate");
								break;
							case 3 :
								sbp.s_f("al");
								break;
							case 4 :
								sbp.s_f("ic");
								break;
							case 5 :
								sbp.s_d();
								break;
							case 6 :
								if (r_R2())
									sbp.s_d();
								break;
						}
					}
				}
			}
			function r_Step_4() {
				var a_v, v_1;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_7, 18);
				if (a_v) {
					sbp.b = sbp.c;
					if (r_R2()) {
						switch (a_v) {
							case 1 :
								sbp.s_d();
								break;
							case 2 :
								v_1 = sbp.l - sbp.c;
								if (!sbp.e_s_b(1, "s")) {
									sbp.c = sbp.l - v_1;
									if (!sbp.e_s_b(1, "t"))
										return;
								}
								sbp.s_d();
								break;
						}
					}
				}
			}
			function r_Step_5() {
				var a_v, v_1;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_8, 2);
				if (a_v) {
					sbp.b = sbp.c;
					switch (a_v) {
						case 1 :
							v_1 = sbp.l - sbp.c;
							if (!r_R2()) {
								sbp.c = sbp.l - v_1;
								if (!r_R1() || r_shortv())
									return;
								sbp.c = sbp.l - v_1;
							}
							sbp.s_d();
							break;
						case 2 :
							if (!r_R2() || !sbp.e_s_b(1, "l"))
								return;
							sbp.s_d();
							break;
					}
				}
			}
			function r_exception2() {
				sbp.k = sbp.c;
				if (sbp.f_a_b(a_9, 8)) {
					sbp.b = sbp.c;
					return sbp.c <= sbp.lb;
				}
				return false;
			}
			function r_exception1() {
				var a_v;
				sbp.b = sbp.c;
				a_v = sbp.f_a(a_10, 18);
				if (a_v) {
					sbp.k = sbp.c;
					if (sbp.c >= sbp.l) {
						switch (a_v) {
							case 1 :
								sbp.s_f("ski");
								break;
							case 2 :
								sbp.s_f("sky");
								break;
							case 3 :
								sbp.s_f("die");
								break;
							case 4 :
								sbp.s_f("lie");
								break;
							case 5 :
								sbp.s_f("tie");
								break;
							case 6 :
								sbp.s_f("idl");
								break;
							case 7 :
								sbp.s_f("gentl");
								break;
							case 8 :
								sbp.s_f("ugli");
								break;
							case 9 :
								sbp.s_f("earli");
								break;
							case 10 :
								sbp.s_f("onli");
								break;
							case 11 :
								sbp.s_f("singl");
								break;
						}
						return true;
					}
				}
				return false;
			}
			function r_postlude() {
				var v_1;
				if (B_Y_found) {
					while (true) {
						v_1 = sbp.c;
						sbp.b = v_1;
						if (sbp.e_s(1, "Y")) {
							sbp.k = sbp.c;
							sbp.c = v_1;
							sbp.s_f("y");
							continue;
						}
						sbp.c = v_1;
						if (sbp.c >= sbp.l)
							return;
						sbp.c++;
					}
				}
			}
			this.stem = function() {
				var v_1 = sbp.c;
				if (!r_exception1()) {
					sbp.c = v_1;
					var c = sbp.c + 3;
					if (0 <= c && c <= sbp.l) {
						sbp.c = v_1;
						r_prelude();
						sbp.c = v_1;
						r_mark_regions();
						sbp.lb = v_1;
						sbp.c = sbp.l;
						r_Step_1a();
						sbp.c = sbp.l;
						if (!r_exception2())
							for (var i = 0; i < habr.length; i++) {
								sbp.c = sbp.l;
								habr[i]();
							}
						sbp.c = sbp.lb;
						r_postlude();
					}
				}
				return true;
			}
		},
		RussianStemmer : function() {
			var a_0 = [new Among("\u0432", -1, 1),
					new Among("\u0438\u0432", 0, 2),
					new Among("\u044B\u0432", 0, 2),
					new Among("\u0432\u0448\u0438", -1, 1),
					new Among("\u0438\u0432\u0448\u0438", 3, 2),
					new Among("\u044B\u0432\u0448\u0438", 3, 2),
					new Among("\u0432\u0448\u0438\u0441\u044C", -1, 1),
					new Among("\u0438\u0432\u0448\u0438\u0441\u044C", 6, 2),
					new Among("\u044B\u0432\u0448\u0438\u0441\u044C", 6, 2)], a_1 = [
					new Among("\u0435\u0435", -1, 1),
					new Among("\u0438\u0435", -1, 1),
					new Among("\u043E\u0435", -1, 1),
					new Among("\u044B\u0435", -1, 1),
					new Among("\u0438\u043C\u0438", -1, 1),
					new Among("\u044B\u043C\u0438", -1, 1),
					new Among("\u0435\u0439", -1, 1),
					new Among("\u0438\u0439", -1, 1),
					new Among("\u043E\u0439", -1, 1),
					new Among("\u044B\u0439", -1, 1),
					new Among("\u0435\u043C", -1, 1),
					new Among("\u0438\u043C", -1, 1),
					new Among("\u043E\u043C", -1, 1),
					new Among("\u044B\u043C", -1, 1),
					new Among("\u0435\u0433\u043E", -1, 1),
					new Among("\u043E\u0433\u043E", -1, 1),
					new Among("\u0435\u043C\u0443", -1, 1),
					new Among("\u043E\u043C\u0443", -1, 1),
					new Among("\u0438\u0445", -1, 1),
					new Among("\u044B\u0445", -1, 1),
					new Among("\u0435\u044E", -1, 1),
					new Among("\u043E\u044E", -1, 1),
					new Among("\u0443\u044E", -1, 1),
					new Among("\u044E\u044E", -1, 1),
					new Among("\u0430\u044F", -1, 1),
					new Among("\u044F\u044F", -1, 1)], a_2 = [
					new Among("\u0435\u043C", -1, 1),
					new Among("\u043D\u043D", -1, 1),
					new Among("\u0432\u0448", -1, 1),
					new Among("\u0438\u0432\u0448", 2, 2),
					new Among("\u044B\u0432\u0448", 2, 2),
					new Among("\u0449", -1, 1),
					new Among("\u044E\u0449", 5, 1),
					new Among("\u0443\u044E\u0449", 6, 2)], a_3 = [
					new Among("\u0441\u044C", -1, 1),
					new Among("\u0441\u044F", -1, 1)], a_4 = [
					new Among("\u043B\u0430", -1, 1),
					new Among("\u0438\u043B\u0430", 0, 2),
					new Among("\u044B\u043B\u0430", 0, 2),
					new Among("\u043D\u0430", -1, 1),
					new Among("\u0435\u043D\u0430", 3, 2),
					new Among("\u0435\u0442\u0435", -1, 1),
					new Among("\u0438\u0442\u0435", -1, 2),
					new Among("\u0439\u0442\u0435", -1, 1),
					new Among("\u0435\u0439\u0442\u0435", 7, 2),
					new Among("\u0443\u0439\u0442\u0435", 7, 2),
					new Among("\u043B\u0438", -1, 1),
					new Among("\u0438\u043B\u0438", 10, 2),
					new Among("\u044B\u043B\u0438", 10, 2),
					new Among("\u0439", -1, 1),
					new Among("\u0435\u0439", 13, 2),
					new Among("\u0443\u0439", 13, 2),
					new Among("\u043B", -1, 1),
					new Among("\u0438\u043B", 16, 2),
					new Among("\u044B\u043B", 16, 2),
					new Among("\u0435\u043C", -1, 1),
					new Among("\u0438\u043C", -1, 2),
					new Among("\u044B\u043C", -1, 2),
					new Among("\u043D", -1, 1),
					new Among("\u0435\u043D", 22, 2),
					new Among("\u043B\u043E", -1, 1),
					new Among("\u0438\u043B\u043E", 24, 2),
					new Among("\u044B\u043B\u043E", 24, 2),
					new Among("\u043D\u043E", -1, 1),
					new Among("\u0435\u043D\u043E", 27, 2),
					new Among("\u043D\u043D\u043E", 27, 1),
					new Among("\u0435\u0442", -1, 1),
					new Among("\u0443\u0435\u0442", 30, 2),
					new Among("\u0438\u0442", -1, 2),
					new Among("\u044B\u0442", -1, 2),
					new Among("\u044E\u0442", -1, 1),
					new Among("\u0443\u044E\u0442", 34, 2),
					new Among("\u044F\u0442", -1, 2),
					new Among("\u043D\u044B", -1, 1),
					new Among("\u0435\u043D\u044B", 37, 2),
					new Among("\u0442\u044C", -1, 1),
					new Among("\u0438\u0442\u044C", 39, 2),
					new Among("\u044B\u0442\u044C", 39, 2),
					new Among("\u0435\u0448\u044C", -1, 1),
					new Among("\u0438\u0448\u044C", -1, 2),
					new Among("\u044E", -1, 2),
					new Among("\u0443\u044E", 44, 2)], a_5 = [
					new Among("\u0430", -1, 1),
					new Among("\u0435\u0432", -1, 1),
					new Among("\u043E\u0432", -1, 1),
					new Among("\u0435", -1, 1),
					new Among("\u0438\u0435", 3, 1),
					new Among("\u044C\u0435", 3, 1),
					new Among("\u0438", -1, 1),
					new Among("\u0435\u0438", 6, 1),
					new Among("\u0438\u0438", 6, 1),
					new Among("\u0430\u043C\u0438", 6, 1),
					new Among("\u044F\u043C\u0438", 6, 1),
					new Among("\u0438\u044F\u043C\u0438", 10, 1),
					new Among("\u0439", -1, 1),
					new Among("\u0435\u0439", 12, 1),
					new Among("\u0438\u0435\u0439", 13, 1),
					new Among("\u0438\u0439", 12, 1),
					new Among("\u043E\u0439", 12, 1),
					new Among("\u0430\u043C", -1, 1),
					new Among("\u0435\u043C", -1, 1),
					new Among("\u0438\u0435\u043C", 18, 1),
					new Among("\u043E\u043C", -1, 1),
					new Among("\u044F\u043C", -1, 1),
					new Among("\u0438\u044F\u043C", 21, 1),
					new Among("\u043E", -1, 1), new Among("\u0443", -1, 1),
					new Among("\u0430\u0445", -1, 1),
					new Among("\u044F\u0445", -1, 1),
					new Among("\u0438\u044F\u0445", 26, 1),
					new Among("\u044B", -1, 1), new Among("\u044C", -1, 1),
					new Among("\u044E", -1, 1),
					new Among("\u0438\u044E", 30, 1),
					new Among("\u044C\u044E", 30, 1),
					new Among("\u044F", -1, 1),
					new Among("\u0438\u044F", 33, 1),
					new Among("\u044C\u044F", 33, 1)], a_6 = [
					new Among("\u043E\u0441\u0442", -1, 1),
					new Among("\u043E\u0441\u0442\u044C", -1, 1)], a_7 = [
					new Among("\u0435\u0439\u0448\u0435", -1, 1),
					new Among("\u043D", -1, 2),
					new Among("\u0435\u0439\u0448", -1, 1),
					new Among("\u044C", -1, 3)], g_v = [33, 65, 8, 232], I_p2, I_pV, sbp = new SnowballProgram();
			this.setCurrent = function(word) {
				sbp.s_c(word);
			};
			this.getCurrent = function() {
				return sbp.g_c();
			};
			function habr3() {
				while (!sbp.i_g(g_v, 1072, 1103)) {
					if (sbp.c >= sbp.l)
						return false;
					sbp.c++;
				}
				return true;
			}
			function habr4() {
				while (!sbp.o_g(g_v, 1072, 1103)) {
					if (sbp.c >= sbp.l)
						return false;
					sbp.c++;
				}
				return true;
			}
			function r_mark_regions() {
				I_pV = sbp.l;
				I_p2 = I_pV;
				if (habr3()) {
					I_pV = sbp.c;
					if (habr4())
						if (habr3())
							if (habr4())
								I_p2 = sbp.c;
				}
			}
			function r_R2() {
				return I_p2 <= sbp.c;
			}
			function habr2(a, n) {
				var a_v, v_1;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a, n);
				if (a_v) {
					sbp.b = sbp.c;
					switch (a_v) {
						case 1 :
							v_1 = sbp.l - sbp.c;
							if (!sbp.e_s_b(1, "\u0430")) {
								sbp.c = sbp.l - v_1;
								if (!sbp.e_s_b(1, "\u044F"))
									return false;
							}
						case 2 :
							sbp.s_d();
							break;
					}
					return true;
				}
				return false;
			}
			function r_perfective_gerund() {
				return habr2(a_0, 9);
			}
			function habr1(a, n) {
				var a_v;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a, n);
				if (a_v) {
					sbp.b = sbp.c;
					if (a_v == 1)
						sbp.s_d();
					return true;
				}
				return false;
			}
			function r_adjective() {
				return habr1(a_1, 26);
			}
			function r_adjectival() {
				var a_v;
				if (r_adjective()) {
					habr2(a_2, 8);
					return true;
				}
				return false;
			}
			function r_reflexive() {
				return habr1(a_3, 2);
			}
			function r_verb() {
				return habr2(a_4, 46);
			}
			function r_noun() {
				habr1(a_5, 36);
			}
			function r_derivational() {
				var a_v;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_6, 2);
				if (a_v) {
					sbp.b = sbp.c;
					if (r_R2() && a_v == 1)
						sbp.s_d();
				}
			}
			function r_tidy_up() {
				var a_v;
				sbp.k = sbp.c;
				a_v = sbp.f_a_b(a_7, 4);
				if (a_v) {
					sbp.b = sbp.c;
					switch (a_v) {
						case 1 :
							sbp.s_d();
							sbp.k = sbp.c;
							if (!sbp.e_s_b(1, "\u043D"))
								break;
							sbp.b = sbp.c;
						case 2 :
							if (!sbp.e_s_b(1, "\u043D"))
								break;
						case 3 :
							sbp.s_d();
							break;
					}
				}
			}
			this.stem = function() {
				r_mark_regions();
				sbp.c = sbp.l;
				if (sbp.c < I_pV)
					return false;
				sbp.lb = I_pV;
				if (!r_perfective_gerund()) {
					sbp.c = sbp.l;
					if (!r_reflexive())
						sbp.c = sbp.l;
					if (!r_adjectival()) {
						sbp.c = sbp.l;
						if (!r_verb()) {
							sbp.c = sbp.l;
							r_noun();
						}
					}
				}
				sbp.c = sbp.l;
				sbp.k = sbp.c;
				if (sbp.e_s_b(1, "\u0438")) {
					sbp.b = sbp.c;
					sbp.s_d();
				} else
					sbp.c = sbp.l;
				r_derivational();
				sbp.c = sbp.l;
				r_tidy_up();
				return true;
			}
		},
		
	}
	var stemName = lng.substring(0, 1).toUpperCase()
			+ lng.substring(1).toLowerCase() + "Stemmer";
	return new stemFactory[stemName]();
}

if (typeof define === 'function' && define.amd) {
    define([], function() {
        return Snowball;
    });
}

