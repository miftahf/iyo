#!/usr/bin/env python
import web
import xml.etree.ElementTree as ET
import sys, getopt, os, json, mapnik2, tempfile, urllib2, cPickle, shutil, zlib
import math
import sqlite3 as lite
import re
import glob

from subprocess import Popen, PIPE
from xml.dom import minidom
from shutil import copyfile

try:
  from mapnik2 import ProjTransform, Projection, Box2d, Image
except ImportError, E:
  sys.exit("Requires mapnik2 SVN r822 or greater:\n%s" % E)

cached_tiles = {}
cached_xml = {}
cached_maps = {}
xmldir = '@amilna/yii2-iyo/xml'
ip = "127.0.0.1"	
ports = [1401]
webdir = "@web"	
zoomcache = -1
tiledir = "@web/tile"
tileURL = "/tile"
dbdsn = "pgsql:host=localhost;dbname=iyo"
dbpfx = "tbl_"
dbusr = "postgres"
dbpwd = "postgres"
geomCol = "the_geom"
sslCert = False
sslKey = False
phpFile = "php"
execFile = "@amilna/yii2-iyo/components/exec"
web.config.debug = False

def main(argv):		
	global ip
	global ports
	global webdir
	global xmldir
	global zoomcache
	global tiledir
	global dbdsn
	global dbpfx
	global dbusr
	global dbpwd
	global geomCol
	global sslCert
	global sslKey
	global phpFile
	global execFile
	global tileURL
		   
	try:
		opts, args = getopt.getopt(argv,"ha:p:d:x:c:t:D:P:U:W:G:C:K:H:E:T:",["ipAddress","port","webDir","xmlDir","zoomCache","tileURL","dsn","tablePrefix","username","password","geomCol","sslCert","sslkey","phpFile","execFile","tileURL"])
	except getopt.GetoptError:
		print 'webtilep.py -a <ipAddress> -p <port> -d <webDir> -x <xmlDir> -c <zoomCache> -t <tiledir> -D <dsn> -P <tablePrefix> -U <username> -W <password> -G <geomCol> -C <sslCert> -K <sslKey> -H <phpFile> -E <execFile> -T <tileURL>'
		sys.exit(2)	  	
	  
	for opt, arg in opts:
		if opt == '-h':
			print 'webtilep.py -a <ipAddress> -p <port> -d <webDir> -x <xmlDir> -c <zoomCache> -t <tiledir> -D <dsn> -P <tablePrefix> -U <username> -W <password> -G <geomCol> -C <sslCert> -K <sslKey> -H <phpFile> -E <execFile> -T <tileURL>'
			sys.exit()
		elif opt in ("-a", "--ipAddress"):
			ip = arg			
		elif opt in ("-p", "--port"):
			ports = []
			for p in arg.split(','):
				ports.append(int(p))
		elif opt in ("-d", "--webDir"):			
			webdir = arg
		elif opt in ("-x", "--xmlDir"):			
			xmldir = arg	
		elif opt in ("-c", "--zoomCache"):
			zoomcache = int(arg)
		elif opt in ("-t", "--tiledir"):
			tiledir = arg			
		elif opt in ("-D", "--dsn"):
			dbdsn = arg	
		elif opt in ("-P", "--tablePrefix"):
			dbpfx = arg	
		elif opt in ("-U", "--username"):
			dbusr = arg		
		elif opt in ("-W", "--password"):
			dbpwd = arg		
		elif opt in ("-G", "--geomCol"):
			geomCol = arg		
		elif opt in ("-C", "--sslCert"):
			sslCert = arg		
		elif opt in ("-K", "--sslKey"):
			sslKey = arg		
		elif opt in ("-H", "--phpFile"):
			phpFile = arg				
		elif opt in ("-E", "--execFile"):
			execFile = arg			
		elif opt in ("-T", "--tileURL"):
			tileURL = arg	
					
	urls = (		
		tileURL+'/([a-zA-Z0-9_]+)', 'clear_tile',
		tileURL+'/([a-zA-Z0-9_]+)/(\d+)/(\d+)/(\d+).(png|json)', 'get_tile',
		tileURL+'/([a-zA-Z0-9_]+)/\+(\d+)/(\d+)/(\d+)/(\d+).png', 'get_image'
	)			
	
	if sslCert and sslKey:
		from web.wsgiserver import CherryPyWSGIServer
		CherryPyWSGIServer.ssl_certificate = sslCert
		CherryPyWSGIServer.ssl_private_key = sslKey
		
	app = TMS(urls, globals())
	app.run(ip=ip,port=int(ports[0]))				

class TMS(web.application):
	def run(self, ip='0.0.0.0', port=8080, *middleware):
		func = self.wsgifunc(*middleware)
		return web.httpserver.runsimple(func, (ip, port))

class Tilep:
	def getLonLat(self, x, y, z):
		n = 2.0 ** z
		lon = x / n * 360.0 - 180.0
		lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
		lat = math.degrees(lat_rad)
		return [lon, lat]
	def getTile(self, lon, lat, z):
		lat_rad = math.radians(lat)
		n = 2.0 ** z
		x = int((lon + 180.0) / 360.0 * n)
		y = int((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
		return [x, y]
	def getBbox(self, x, y, z):		
		s = self.getLonLat(x, y, z)
		e = self.getLonLat(x+1, y+1, z)
		if (s[0] > 360):
			s[0] = (s[0]%360)+(s[0]-math.floor(s[0]))
			e[0] = (e[0]%360)+(e[0]-math.floor(e[0]))		
		if (s[0] > 180):
			s[0] = s[0]-360			
		if (e[0] > 180):
			e[0] = e[0]-360		
		return (s[0],e[1],e[0],s[1])
	def getQuery(self, qray):			
		if isinstance(qray, list) :
			dvarl = qray
			if isinstance(qray[0], list) :
				dvar = self.getQuery(qray[0])
			else :					
				rvar = re.compile(r"(insert|update|delete)", re.IGNORECASE)
				dvar = rvar.sub("", str(qray[0]))				
				dvarl = re.match(r"([a-zA-Z0-9_\.]+)", dvar)			
						
			dopl = re.match(r"^(like|not like|and|or|!=|=|<|>|<=|>=)$",str(qray[1]).lower())
			
			dparaml = qray
			if isinstance(qray[2], list) :
				dparam = self.getQuery(qray[2])
			else :					
				rparam = re.compile(r"(insert|update|delete)", re.IGNORECASE)
				dparam = rparam.sub("", str(qray[2]))
				dparaml = re.match(r"([a-zA-Z0-9_ \%\']+)", dparam)																		
			
			if dvarl != None and dopl != None and dparaml != None :
				if dopl.group(1) == 'like' or dopl.group(1) == 'not like':
					qray = "(lower("+dvar+") "+dopl.group(1)+" "+dparam.lower()+")"								
				else :	
					dop = dopl.group(1).replace('<','&lt;').replace('>','&gt;')	
					qray = "("+dvar+" "+dop+" "+dparam+")"				
			else :
				qray = "1"
					
		return qray
	def queryXml(self,qc,xmlstr):
		wxml = re.compile(r"WHERE ([a-zA-Z0-9_ \'\"\.,\&\;\>\<\!\=\(\)]+)\) as layer", re.IGNORECASE)								
		wxmlstr = wxml.sub(r"WHERE "+qc+r" AND \1) as layer", xmlstr)																																									
		if (wxmlstr == xmlstr) :
			gxml = re.compile(r"GROUP BY ([a-zA-Z0-9_ \"\.,]+)\) as layer", re.IGNORECASE)								
			gxmlstr = gxml.sub(r"WHERE "+qc+r" GROUP BY \1) as layer", xmlstr)																																										
			if (gxmlstr == xmlstr) :
				oxml = re.compile(r"ORDER BY ([a-zA-Z0-9_ \"\.,]+)\) as layer", re.IGNORECASE)								
				oxmlstr = oxml.sub(r"WHERE "+qc+r" ORDER BY \1) as layer", xmlstr)																																												
				if (oxmlstr != xmlstr) :
					xmlstr = oxmlstr
				else :
					nxml = re.compile(r"([a-zA-Z0-9_ \'\"\.,\&\;\>\<\!\=\(\)]+)\) as layer", re.IGNORECASE)								
					xmlstr = nxml.sub(r"\1 WHERE "+qc+r" ) as layer", xmlstr)
			else :
				xmlstr = gxmlstr	
		else :
			xmlstr = wxmlstr	
		
		return xmlstr			
	def getDb(self, dbname, isxml=False):
		adir = os.path.dirname(os.path.realpath(__file__))	
		if not isxml:
			sub = '/dbs'
			csql = 'CREATE TABLE IF NOT EXISTS tiles (z INT NOT NULL, x INT NOT NULL, y INT NOT NULL, minx REAL NOT NULL, miny REAL NOT NULL, maxx REAL NOT NULL, maxy REAL NOT NULL, src BLOB NOT NULL , sffx TEXT NOT NULL, q TEXT )'
		else:
			sub = ''
			csql = 'CREATE TABLE IF NOT EXISTS xmls (tilename TEXT NOT NULL, src BLOB NOT NULL, q TEXT )'								
			
		if not os.path.exists(adir+sub):
			try:				
				os.makedirs(adir+sub)								
			except:
				pass
		
		src = adir+'/tile.db'
		dst = adir+sub+'/'+dbname+'.db'
		if not os.path.exists(dst):
			copyfile(src, dst)				
			if os.path.exists(dst):				
				con = lite.connect(dst)
				cur = con.cursor()    								
				cur.execute(csql)										
			else:				
				dst = False			
				
		con = lite.connect(dst)
		cur = con.cursor()    						
		try :			
			if not isxml:
				asql = "ALTER TABLE tiles ADD COLUMN q 'TEXT'"
			else:
				asql = "ALTER TABLE xmls ADD COLUMN q 'TEXT'"
			cur.execute(asql)										
		except :
			pass
		cur.close()	
			
		return dst
	def getXml(self, tilename, isforce = False, q = ''):
		
		xmlstr = False		
		isfromdir = (tilename[:3] != 'iyo')
		if isfromdir:
			if os.path.exists(xmldir):
				if tilename+'.xml' in os.listdir(xmldir):
					xmlstr = open(xmldir+'/'+tilename+'.xml',"rb").read()
					xmlstr = xmlstr.replace('{xmldir}', xmldir)					
					
					if xmlstr:							
						if q != '':																				
							try:
								qray = json.loads(q)
							except ValueError:
								qray = False	
								
							if isinstance(qray, list):
								qc = str(self.getQuery(qray))
								
								if qc != "" :																												
									xmlstr = self.queryXml(qc,xmlstr)
		
		else:						
			dbfile = self.getDb('xml',True)	
			if (dbfile):
				con = lite.connect(dbfile)
				cur = con.cursor()    				
			
				if not isforce:		
					if (q == '') :						
						sql = "SELECT * from xmls WHERE tilename = ? AND (q is null or q = ?);"
					else :	
						sql = "SELECT * from xmls WHERE tilename = ? AND q = ?;"
						
					cur.execute(sql,[tilename,q])		
					rows = cur.fetchall()
					n = 0
					for row in rows:						
						xmlstr = zlib.decompress(row[1])
																		
				if not xmlstr:
					ts = tilename.split('_')
					layId = '-1'
					layName = ''
					for n in range(0,len(ts)):
						if n == 0:
							layId = ts[n][3:]
						else:
							pre = '_'
							if (layName == ''):
								pre = ''
							layName = layName+pre+ts[n]															
																	
					p = Popen([phpFile,execFile,"-action=getXml","-dsn="+dbdsn,"-tablePrefix="+dbpfx,"-username="+dbusr,"-password="+dbpwd,"-param="+layId+"~"+layName+"~"+geomCol+"~1~"+webdir], stdin=PIPE, stdout=PIPE, stderr=PIPE)
					
					xoutput, err = p.communicate(b"input data that is passed to subprocess' stdin")											
					if xoutput[:5] == '<Map ':
						xmlstr = xoutput
						
					if xmlstr:
						
						if q != '':							
							
							#xmlstr = xmlstr.replace("WHERE istoday &gt;= 0 order by istoday desc,confidence desc","group by acq_dates order by istoday desc,confidence desc")
							
							try:
								qray = json.loads(q)
							except ValueError:
								qray = False	
								
							if isinstance(qray, list):
								qc = str(self.getQuery(qray))
								
								if qc != "" :																												
									xmlstr = self.queryXml(qc,xmlstr)																														
												
															
						sql = "DELETE from xmls WHERE tilename = ? AND q = ?;"
						cur.execute(sql,[tilename,q])
						sql = "INSERT INTO xmls VALUES (?,?,?);"			
						cur.execute(sql,[tilename,lite.Binary(zlib.compress(xmlstr)),q])
						con.commit()
						cur.close()
				
		return xmlstr	

class clear_tile:
	def GET(self, tilename):				
		qs = web.input(r='',x='',q='',b='')								
		
		tilep = Tilep()
				
		if qs.r != '' :						
			adir = os.path.dirname(os.path.realpath(__file__))+'/dbs/'		
			adir = adir.replace('\\','/')			
			dst = adir+tilename+'.db'			
			itesl = None			
			if not os.path.exists(dst):
				dbfilets = []
				itesl = re.match(r"([a-zA-Z0-9_\.]+)_0EPSG0", tilename)								
				if itesl != None:
					tilename = tilename.replace('_0EPSG0','')					
					os.chdir(adir)
					for file in glob.glob(tilename+"_*.db"):						
						dbfilets.append(adir+file)
					
			else:				
				dbfilets = [adir+tilename+'.db']
			
			ndb = len(dbfilets)																	
			
			for d in range(0, ndb): 
				dbfilet = dbfilets[d]			
				if qs.b == '':			
					shutil.rmtree(tiledir+"/"+tilename,ignore_errors=True)					
					#from subprocess import call
					#call(["rm","-R",tiledir+"/"+tilename])				
					if dbfilet :
						os.unlink(dbfilet)
						#call(["rm",dbfilet])
				else :						
					boxs = qs.b.split(",")
					minx = float(boxs[0])		
					miny = float(boxs[1])
					maxx = float(boxs[2])
					maxy = float(boxs[3])										
										
					if dbfilet :
						cont = lite.connect(dbfilet)
						curt = cont.cursor()														
						sql = "DELETE from tiles WHERE ((maxx >= ? AND maxy >= ? AND  minx <= ? AND miny <= ?) OR (minx <= ? AND miny <= ? AND maxx >= ? AND maxy >= ?))"																					
						curt.execute(sql,[minx,miny,maxx,maxy,minx,miny,maxx,maxy])												
						cont.commit()
						curt.close()												
						ps = ps
						
		isforce = True
		if qs.x == '':
			isforce = False
		
		xmlstr = True
		if itesl == None:				
			xmlstr = tilep.getXml(tilename,isforce,qs.q)		
		
		web.header("Access-Control-Allow-Origin", "*")
		web.header("Content-Type", "text/plain")
		if xmlstr:						
			return '{"tilename":"'+tilename+'","status":true}'			
		else :
			return '{"tilename":"'+tilename+'","status":false}'	
				
			
class get_tile:
	def GET(self, tilename, z, x, y, sffx):								
		
		z = int(z)
		x = int(x)
		y = int(y)
		
		if (z < 0 or z > 19):
			return ''
		
		cType = {
            "png":"image/png",
            "json":"text/plain"
		}
				
		qs = web.input(r='',x='',q='')
		isCache = False
		if qs.r == '':
			isCache = True								
		
		output = False			
		tilep = Tilep()	
		
		web.header("Access-Control-Allow-Origin", "*")
		
		dbfilet = tilep.getDb(tilename)
			
		if dbfilet:
			cont = lite.connect(dbfilet)
			curt = cont.cursor()
		
		if isCache and dbfilet:
			
			if (qs.q == '') :
				sql = "SELECT * from tiles WHERE z = ? AND x = ? AND y = ? AND sffx = ? AND (q is null or q = ?);"				
			else :	
				sql = "SELECT * from tiles WHERE z = ? AND x = ? AND y = ? AND sffx = ? AND q = ?;"				
				
			curt.execute(sql,[z,x,y,sffx,qs.q])
					
			rows = curt.fetchall()								
			for row in rows:						
				output = zlib.decompress(row[7])					
			
			if output:										
				web.header("Content-Type", cType[sffx])				
				return output
			
		if not output:
			isforce = True
			if qs.x == '':
				isforce = False
						
			xmlstr = tilep.getXml(tilename,isforce,qs.q)
				
			if not xmlstr:				
				return ''
			else:																															
				box = tilep.getBbox(z=z,x=x,y=y)		
				geo_extent = Box2d(box[0],box[1],box[2],box[3])		
				
				geo_proj = Projection('+init=epsg:4326')
				merc_proj = Projection('+init=epsg:3857')	

				transform = ProjTransform(geo_proj,merc_proj)
				merc_extent = transform.forward(geo_extent)	
				
				mp = mapnik2.Map(256,256)
				mapnik2.load_map_from_string(mp,xmlstr)																
				mp.zoom_to_box(merc_extent)																							
									
				if sffx == 'png':
					im = Image(mp.width,mp.height)		
					mapnik2.render(mp,im)
					output = im.tostring('png')																	
											
					if dbfilet:
						minx = box[0]																						
						miny = box[1]
						maxx = box[2]
						maxy = box[3]
						
						sql = "INSERT INTO tiles VALUES (?,?,?,?,?,?,?,?,?,?);"			
						curt.execute(sql,[z,x,y,minx,miny,maxx,maxy,lite.Binary(zlib.compress(output)),sffx,qs.q])						
							
						cont.commit()
						curt.close()
											
					#if zoomcache >= z :
					#	mapnik2.render_to_file(mp, str(afile))																									
										
					web.header("Content-Type", cType[sffx])																						
					return output
				elif sffx == 'json':
					xmldoc = minidom.parseString(xmlstr)			
					itemlist = xmldoc.getElementsByTagName('Layer') 
					
					nlay = len(itemlist)
					fields = []
					resolution = 4 #Pixel resolution of output.   
					li = 0																								
																
					for ly in range(0, nlay):							
						resolution = 4
						dat = itemlist[ly].getElementsByTagName('Datasource')[0] 
						par = dat.getElementsByTagName('Parameter')	
						for s in par :
							dv = s.attributes['name'].value								
							dck = False								
							if (dv[6:] == ''):
								dck = True
							elif (dv[6:].isdigit()):
								dck = (z >= int(dv[6:]))
							
							if dv[:6] == 'fields' and dck and fields == [] :
								text = s.childNodes[0].nodeValue.encode("utf-8")
								fields = text.split(",")
								li = ly
								
							if dv == 'resolution':
								res = s.childNodes[0].nodeValue.encode("utf-8")									
								resolution = int(res)	
										
					layer_index = li #First layer on the map - index in m.layers
					key = "__id__"  #Field used for the key in mapnik2 (should probably be unique)		
						
					enfix = ""						
					#if ly > 0:
					#	enfix = "_"+str(ly)																			

					#return str(len(fields))

					if len(fields) > 0:		
						d = mapnik2.render_grid(mp, layer_index, key, resolution, fields) #returns a dictionary		
						output = "grid("+json.dumps(d)+")"														
					else:
						output = ''																		
					
					if output != '':											
						
						if dbfilet:
							minx = box[0]																						
							miny = box[1]
							maxx = box[2]
							maxy = box[3]
							
							sql = "INSERT INTO tiles VALUES (?,?,?,?,?,?,?,?,?,?);"			
							curt.execute(sql,[z,x,y,minx,miny,maxx,maxy,lite.Binary(zlib.compress(output)),sffx,qs.q])							
								
							cont.commit()								
							curt.close()
						
						#if zoomcache >= z :
						#	f = open(afile,'wb')
						#	f.write(output)	
						#	f.close()
										
					web.header("Content-Type", cType[sffx])																						
					return output
				else:					
					return ''																	
			

class get_image:
	def GET(self, tilename, epsg, z, x, y):						
		
		global cached_maps
		
		sffx = 'png'
		epsg = int(epsg)
		z = int(z)
		x = int(x)
		y = int(y)
		
		if (z < 0 or z > 19):
			return ''
		
		cType = {
            "png":"image/png"
		}
				
		qs = web.input(r='',x='',q='')
		isCache = False
		if qs.r == '':
			isCache = True								
		
		output = False			
		tilep = Tilep()	
		
		web.header("Access-Control-Allow-Origin", "*")
		
		atilename = tilename+'_'+str(epsg)
		
		dbfilet = tilep.getDb(atilename)
		if dbfilet:
			cont = lite.connect(dbfilet)
			curt = cont.cursor()
				
		if isCache and dbfilet:		
			if (qs.q == '') :
				sql = "SELECT * from tiles WHERE z = ? AND x = ? AND y = ? AND sffx = ? AND (q is null or q = ?);"				
			else :	
				sql = "SELECT * from tiles WHERE z = ? AND x = ? AND y = ? AND sffx = ? AND q = ?;"				
				
			curt.execute(sql,[z,x,y,sffx,qs.q])		
			rows = curt.fetchall()								
			for row in rows:						
				output = zlib.decompress(row[7])					
			
			if output:										
				web.header("Content-Type", cType[sffx])				
				return output
			
		if not output:	
						
			box = tilep.getBbox(z=z,x=x,y=y)		
			geo_extent = Box2d(box[0],box[1],box[2],box[3])		
			
			geo_proj = Projection('+init=epsg:4326')
			merc_proj = Projection('+init=epsg:'+str(epsg))	

			transform = ProjTransform(geo_proj,merc_proj)
			merc_extent = transform.forward(geo_extent)
			
			mp = False
			if isCache and atilename in cached_maps :				
				if qs.q in cached_maps[atilename]:
					mp = cached_maps[atilename][qs.q]
			
			if not mp:
																						
				mp = mapnik2.Map(256,256,'+init=epsg:'+str(epsg))			
					
				s = mapnik2.Style()
				r = mapnik2.Rule()
				r.symbols.append(mapnik2.RasterSymbolizer())
				s.rules.append(r)
				mp.append_style('RStyle',s)								
				
				adir = os.path.dirname(os.path.realpath(__file__))
				coni = lite.connect(adir+'/indeks.db')
				curi = coni.cursor()    								
				
				sql = "SELECT * FROM indeks WHERE name = ? AND epsg = ? AND ((maxx >= ? AND maxy >= ? AND  minx <= ? AND miny <= ?) OR (minx <= ? AND miny <= ? AND maxx >= ? AND maxy >= ?))"
				if (qs.q != '') :
					try:
						qray = json.loads(qs.q)
					except ValueError:
						qray = False	
						
					if isinstance(qray, list):
						qray[0]= 'filename'
						qc = str(tilep.getQuery(qray))						
						sql = sql+"AND "+qc					
					
				curi.execute(sql,[tilename,epsg,str(merc_extent[0]),str(merc_extent[1]),str(merc_extent[2]),str(merc_extent[3]),str(merc_extent[0]),str(merc_extent[1]),str(merc_extent[2]),str(merc_extent[3])])
			#ok	sql = "SELECT * FROM indeks WHERE name = ? AND epsg = ?;"			
			#ok	curi.execute(sql,[tilename,epsg])
				rows = curi.fetchall()
				n = 0
				for row in rows:						
					afilename = str(row[1])
					ds = mapnik2.Gdal(file=afilename)
					layer = mapnik2.Layer('raster'+str(n),'+init=epsg:'+str(epsg))									
					layer.datasource = ds
					layer.styles.append('RStyle')
					mp.layers.append(layer)
					n = n+1
				
				#xmlstr = mapnik2.save_map_to_string(mp)
				#print xmlstr								
				#mapnik2.load_map_from_string(mp,xmlstr)																
				
				if atilename not in cached_maps :
					cached_maps[atilename] = {}
					
				#cached_maps[atilename][qs.q] = mp
			
			mp.zoom_to_box(merc_extent)																																										
													
			im = Image(mp.width,mp.height)		
			mapnik2.render(mp,im)
			output = im.tostring('png')																			
			
			if dbfilet:
				minx = box[0]																						
				miny = box[1]
				maxx = box[2]
				maxy = box[3]
				sql = "INSERT INTO tiles VALUES (?,?,?,?,?,?,?,?,?,?);"			
				curt.execute(sql,[z,x,y,minx,miny,maxx,maxy,lite.Binary(zlib.compress(output)),sffx,qs.q])
				cont.commit()
				curt.close()												
						
			web.header("Content-Type", cType[sffx])																						
			return output					
			
		else:
			return ''			
		

if __name__ == "__main__":
    main(sys.argv[1:])
    
app = web.application(urls, globals(), autoreload=False)
application = app.wsgifunc()    
