import ipaddress, json, sys
rows=json.load(sys.stdin)
result=[]
for row in rows:
    network=ipaddress.IPv4Network(f"{row['src']}/{row['prefix']}",strict=False)
    dst=ipaddress.IPv4Network(f"{row.get('dst',row['src'])}/{row['prefix']}",strict=False)
    same=network==dst
    result.append(dict(network=str(network.network_address),broadcast=str(network.broadcast_address),first=str(network.network_address+1),last=str(network.broadcast_address-1),same=same,delivery='direct' if same else 'gateway',networkB=str(dst.network_address)))
json.dump(result,sys.stdout)
